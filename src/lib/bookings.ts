import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@/generated/prisma";
import { checkWithinBusinessHours } from "@/lib/business-hours";
import { assertMaxLength, assertValidDate, normalizeText } from "@/lib/validation";

export async function listServices(businessId: string) {
  return prisma.service.findMany({
    where: { businessId, active: true },
    orderBy: { name: "asc" },
  });
}

export async function listStaff(businessId: string) {
  return prisma.user.findMany({
    where: { businessId, role: "STAFF", active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listUpcomingBookings(businessId: string, limit = 50) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return prisma.booking.findMany({
    // Incluye desde el inicio de hoy (no solo desde "ahora") para que un
    // turno de esta mañana que nunca se cobró siga visible y se pueda
    // marcar como no-show, en vez de desaparecer de la lista sin más.
    where: { businessId, startTime: { gte: startOfToday } },
    orderBy: { startTime: "asc" },
    take: limit,
    include: {
      client: true,
      service: true,
      // select explícito (no `include: { staff: true }`) porque `staff` es
      // un User y traer el registro completo expone passwordHash y otros
      // campos sensibles; la agenda solo necesita el nombre.
      staff: { select: { id: true, name: true } },
      productRequests: { include: { product: true } },
    },
  });
}

// Acepta tanto el cliente global de Prisma como un `tx` de
// `$transaction`, para que `sellGiftCard` (pos.ts) pueda reusar esta misma
// búsqueda dentro de su propia transacción en vez de crear un cliente
// nuevo a ciegas.
type Db = typeof prisma | Prisma.TransactionClient;

async function findOrCreateClientLocked(
  db: Db,
  businessId: string,
  input: { name: string; phone?: string; email?: string },
  email: string | undefined
) {
  // Client solo tiene @@unique([businessId, email]) — nada en la base evita
  // dos filas con el mismo teléfono. Sin email (el caso más común en la
  // reserva pública, donde el teléfono alcanza), dos reservas casi
  // simultáneas con el mismo teléfono nuevo podían pasar ambas el findFirst
  // de abajo antes de que ninguna hubiera insertado todavía — a diferencia
  // del caso con email, acá no hay ningún índice único que frene a la
  // segunda, así que terminaba creando dos clientes para la misma persona
  // (historial de gasto/visitas partido en dos en /admin/clientes) en vez de
  // solo fallar. El advisory lock de Postgres, tomado por el resto de esta
  // transacción (`pg_advisory_xact_lock`, liberado solo al terminar), sirve
  // de mutex para esta combinación de negocio+contacto: la segunda llamada
  // espera a que la primera termine de crear (o encontrar) al cliente antes
  // de hacer su propio `findFirst`, así que ya lo encuentra creado.
  const lockKey = email ?? input.phone;
  if (lockKey) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${businessId}:${lockKey}`}))`;
  }

  const existing = await db.client.findFirst({
    where: {
      businessId,
      OR: [
        email ? { email } : undefined,
        input.phone ? { phone: input.phone } : undefined,
      ].filter(Boolean) as object[],
    },
  });
  if (existing) return existing;

  try {
    return await db.client.create({
      data: {
        businessId,
        name: normalizeText(input.name),
        phone: input.phone || null,
        email: email || null,
      },
    });
  } catch (e) {
    // El advisory lock ya cierra la carrera cuando hay teléfono o email, pero
    // se mantiene este fallback (mismo motivo que antes): sin ningún dato de
    // contacto (`lockKey` vacío) no hay lock que tomar, y si el email sí
    // choca contra el `@@unique` por cualquier otro motivo, reusamos al
    // cliente ya creado en vez de propagar un P2002 crudo.
    const isUniqueEmailConflict =
      email != null &&
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002";
    if (!isUniqueEmailConflict) throw e;
    return db.client.findFirstOrThrow({ where: { businessId, email } });
  }
}

export async function findOrCreateClient(
  businessId: string,
  input: {
    name: string;
    phone?: string;
    email?: string;
  },
  db: Db = prisma
) {
  // email es @@unique([businessId, email]) y Postgres compara case-sensitive
  // por default — sin normalizar, reservar una vez como "juan@gmail.com" y
  // otra como "Juan@Gmail.com" (ej. autocompletado del navegador) creaba dos
  // clientes distintos para la misma persona en vez de encontrar al mismo.
  const email = input.email ? input.email.toLowerCase() : undefined;

  // `pg_advisory_xact_lock` solo sirve adentro de una transacción (se libera
  // al terminarla) — si no nos pasaron una (`db === prisma`, el caso de
  // `createBooking`), abrimos una acá nomás para este chequeo+creación; si
  // ya estamos dentro de una (el caso de `sellGiftCard`), el lock se toma
  // sobre esa misma transacción y se libera cuando esa termine.
  if (db === prisma) {
    return prisma.$transaction((tx) =>
      findOrCreateClientLocked(tx, businessId, input, email)
    );
  }
  return findOrCreateClientLocked(db, businessId, input, email);
}

export async function createBooking(
  businessId: string,
  input: {
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    serviceId: string;
    staffId: string;
    startTime: Date;
    notes?: string;
    productRequests?: { productId: string; quantity: number }[];
  },
  options?: { enforceBusinessHours?: boolean }
) {
  // Tanto /admin/reservas como la reserva pública ya limitan las notas y los
  // datos del cliente en su action, pero createBooking no debería depender
  // de que ese sea el único caller — mismo motivo que llevó a repetir este
  // chequeo acá adentro para el resto de los campos de texto libre.
  assertValidDate(input.startTime, "El horario del turno");
  if (input.notes) assertMaxLength(input.notes, 1000, "Las notas");
  assertMaxLength(input.clientName, 150, "El nombre");
  if (input.clientPhone) assertMaxLength(input.clientPhone, 30, "El teléfono");
  if (input.clientEmail) assertMaxLength(input.clientEmail, 255, "El email");
  const service = await prisma.service.findFirstOrThrow({
    where: { id: input.serviceId, businessId },
  });
  // staffId llega directo del formulario (público en /reservar, o del panel
  // de admin) sin pasar antes por listStaff — sin este chequeo, se podía
  // mandar el id de un staff de OTRO negocio y quedaba guardado tal cual en
  // el turno, mezclando datos entre negocios (el nombre de ese staff ajeno
  // terminaba mostrado en /admin/reservas de este negocio).
  const staff = await prisma.user.findFirst({
    where: { id: input.staffId, businessId, role: "STAFF", active: true },
    select: { id: true },
  });
  if (!staff) {
    throw new Error("El profesional elegido ya no está disponible.");
  }
  const endTime = new Date(
    input.startTime.getTime() + service.durationMinutes * 60_000
  );

  if (options?.enforceBusinessHours) {
    const hoursCheck = await checkWithinBusinessHours(businessId, input.startTime, endTime);
    if (!hoursCheck.ok) {
      throw new Error(hoursCheck.reason);
    }
  }

  const client = await findOrCreateClient(businessId, {
    name: input.clientName,
    phone: input.clientPhone,
    email: input.clientEmail,
  });

  // La reserva pública ya filtra con Number.isInteger antes de llegar acá,
  // pero createBooking no debería depender de que ese sea el único
  // caller — mismo motivo que el resto de las validaciones de este
  // archivo. `quantity` termina en una columna Int; sin este chequeo acá
  // también, una cantidad no entera (ej. 1.5) llegada por otro camino
  // pasaba el filtro de abajo y recién explotaba con un error crudo de
  // Prisma al insertar, en vez de simplemente descartarse como inválida.
  const validRequests = (input.productRequests || []).filter(
    (r) => Number.isInteger(r.quantity) && r.quantity > 0
  );
  if (validRequests.length > 0) {
    const products = await prisma.product.findMany({
      where: { businessId, active: true, id: { in: validRequests.map((r) => r.productId) } },
      select: { id: true, stock: true },
    });
    // La cantidad viene de un formulario público sin autenticar — el
    // frontend ya la limita al stock, pero eso es solo UX, no protege
    // nada. Sin este clamp acá, alguien podía pedir 9999 unidades de un
    // producto con 2 en stock y esa cifra le quedaba en la nota al staff.
    const stockById = new Map(products.map((p) => [p.id, p.stock]));
    validRequests.splice(
      0,
      validRequests.length,
      ...validRequests
        .filter((r) => stockById.has(r.productId))
        .map((r) => ({ ...r, quantity: Math.min(r.quantity, stockById.get(r.productId)!) }))
        .filter((r) => r.quantity > 0)
    );
  }

  const runAttempt = () =>
    prisma.$transaction(
      async (tx) => {
        const conflict = await tx.booking.findFirst({
          where: {
            businessId,
            staffId: input.staffId,
            status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
            startTime: { lt: endTime },
            endTime: { gt: input.startTime },
          },
        });
        if (conflict) {
          throw new Error("Ese profesional ya tiene un turno reservado en ese horario.");
        }

        return tx.booking.create({
          data: {
            businessId,
            clientId: client.id,
            serviceId: service.id,
            staffId: input.staffId,
            startTime: input.startTime,
            endTime,
            notes: input.notes ? normalizeText(input.notes) : null,
            productRequests:
              validRequests.length > 0
                ? {
                    create: validRequests.map((r) => ({
                      productId: r.productId,
                      quantity: r.quantity,
                    })),
                  }
                : undefined,
          },
          include: {
            client: true,
            service: true,
            // select explícito (no `include: { staff: true }`) porque
            // `staff` es un User y traer el registro completo expone
            // passwordHash y otros campos sensibles; los llamadores solo
            // usan el nombre (para notificaciones y mensajes).
            staff: { select: { id: true, name: true } },
            productRequests: { include: { product: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

  // Chequeo de conflicto + creación en una sola transacción serializable:
  // sin esto, dos reservas simultáneas para el mismo profesional/horario
  // (dos clientes reservando el mismo slot al mismo tiempo desde la página
  // pública) podían pasar ambas el chequeo antes de que ninguna hubiera
  // insertado todavía, y terminar dobladas. Serializable hace que Postgres
  // detecte ese solapamiento de escrituras y una de las dos transacciones
  // falle con P2034 — pero esa detección (SSI) puede dar falsos positivos
  // entre transacciones que en realidad no se solapan, así que reintentamos
  // antes de asumir que es un conflicto real: al reintentar, un conflicto
  // genuino vuelve a fallar de forma determinística con el error de
  // negocio de arriba (la otra reserva ya quedó confirmada en la DB), y uno
  // falso simplemente se resuelve solo.
  // MAX_ATTEMPTS=3 alcanzaba para el caso normal, pero bajo carga alta (ej.
  // toda la suite de tests corriendo en paralelo contra la misma tabla) el
  // detector de conflictos de Postgres (SSI) puede dar más de dos falsos
  // positivos seguidos entre transacciones que en realidad no se solapan —
  // eso hacía fallar de forma esporádica un intento de reserva que no tenía
  // ningún conflicto real. Más intentos, con un pequeño backoff con jitter
  // entre cada uno (en vez de reintentar en el instante), reduce esa chance
  // sin cambiar el comportamiento ante un conflicto genuino (que sigue
  // fallando siempre, de forma determinística).
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await runAttempt();
    } catch (e) {
      const isSerializationFailure =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!isSerializationFailure || attempt === MAX_ATTEMPTS) {
        if (isSerializationFailure) {
          throw new Error("Ese profesional ya tiene un turno reservado en ese horario.");
        }
        throw e;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 * attempt));
    }
  }
  throw new Error("No se pudo crear la reserva, intentá de nuevo.");
}

export async function updateBookingStatus(
  businessId: string,
  id: string,
  status: BookingStatus
) {
  const booking = await prisma.booking.findFirstOrThrow({ where: { id, businessId } });
  // Un turno COMPLETED ya tiene una venta cobrada asociada (ver
  // chargeBooking en pos.ts) — cancelarlo o marcarlo no-show después no
  // deshace ese cobro, solo deja el turno mostrando un estado que
  // contradice la plata que sí se cobró, y descuadra las tasas de
  // cancelación/no-show del dashboard contra los ingresos reales.
  if (booking.status === "COMPLETED") {
    throw new Error("Este turno ya fue cobrado, no se puede cambiar su estado.");
  }
  // El chequeo de arriba no alcanza para evitar la carrera con
  // chargeBooking (pos.ts): si alguien cobra el turno justo entre ese
  // chequeo y este update, el cambio de estado de acá (cancelar/no-show)
  // podía pisar el COMPLETED recién puesto, dejando una venta ya cobrada
  // con un turno que dice cancelado. El update va condicionado igual que
  // chargeBooking — si ya se cobró en el medio, esta acción aborta en vez
  // de pisarlo.
  const updated = await prisma.booking.updateMany({
    where: { id, businessId, status: { not: "COMPLETED" } },
    data: { status },
  });
  if (updated.count === 0) {
    throw new Error("Este turno ya fue cobrado, no se puede cambiar su estado.");
  }
  return prisma.booking.findFirstOrThrow({ where: { id, businessId } });
}
