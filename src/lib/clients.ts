import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { assertMaxLength } from "@/lib/validation";

export const CLIENTS_PAGE_SIZE = 25;

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bookingsCount: bigint;
  totalSpent: Prisma.Decimal | null;
  lastVisit: Date | null;
};

// Antes esta función traía TODOS los clientes con TODAS sus reservas y
// ventas, y ordenaba/sumaba en JS — con negocios grandes eso es cada vez
// más memoria y CPU en cada visita a /admin/clientes, justo porque el
// orden por defecto de la pantalla es "gastado total" (no se puede
// calcular ese orden sin ver todas las ventas de todos los clientes).
// Ahora la suma, el conteo y el orden los hace Postgres con una consulta
// agregada, y solo se trae la página pedida.
export async function listClients(
  businessId: string,
  { skip = 0, take }: { skip?: number; take?: number } = {}
) {
  // `take` es opcional (no undefined != 0): algunos callers (ej. el motor de
  // recomendaciones, que necesita ver a TODOS los clientes para detectar
  // inactivos) necesitan la lista completa, no solo una página.
  const limitClause = take !== undefined ? Prisma.sql`LIMIT ${take}` : Prisma.empty;
  const rows = await prisma.$queryRaw<ClientRow[]>`
    SELECT
      c.id,
      c.name,
      c.email,
      c.phone,
      COALESCE(booking_agg."bookingsCount", 0) AS "bookingsCount",
      COALESCE(sale_agg."totalSpent", 0) AS "totalSpent",
      GREATEST(booking_agg."lastBooking", sale_agg."lastSale") AS "lastVisit"
    FROM "Client" c
    LEFT JOIN (
      SELECT "clientId", SUM(total) AS "totalSpent", MAX("createdAt") AS "lastSale"
      FROM "Sale"
      WHERE "businessId" = ${businessId} AND "clientId" IS NOT NULL
      GROUP BY "clientId"
    ) sale_agg ON sale_agg."clientId" = c.id
    LEFT JOIN (
      SELECT "clientId", COUNT(*) AS "bookingsCount", MAX("startTime") AS "lastBooking"
      FROM "Booking"
      WHERE "businessId" = ${businessId} AND status = 'COMPLETED'
      GROUP BY "clientId"
    ) booking_agg ON booking_agg."clientId" = c.id
    WHERE c."businessId" = ${businessId}
    ORDER BY "totalSpent" DESC, c.name ASC
    ${limitClause}
    OFFSET ${skip}
  `;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    bookingsCount: Number(r.bookingsCount),
    totalSpent: r.totalSpent ? Number(r.totalSpent) : 0,
    lastVisit: r.lastVisit,
  }));
}

export async function countClients(businessId: string) {
  return prisma.client.count({ where: { businessId } });
}

// findFirst (no findFirstOrThrow): un id que no existe o de otro negocio
// debe poder mostrarse como "no encontrado" (ver notFound() en la página),
// no tumbar la pantalla con el error genérico de Next.
export async function getClientDetail(businessId: string, id: string) {
  return prisma.client.findFirst({
    where: { id, businessId },
    include: {
      bookings: {
        orderBy: { startTime: "desc" },
        include: { service: true, staff: true },
      },
      sales: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
      giftCards: true,
    },
  });
}

export async function listFrequentNoShowClients(businessId: string, minCount = 2) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const noShows = await prisma.booking.findMany({
    where: { businessId, status: "NO_SHOW", startTime: { gte: ninetyDaysAgo } },
    select: { clientId: true, client: { select: { name: true } } },
  });

  const counts = new Map<string, { name: string; count: number }>();
  for (const b of noShows) {
    const entry = counts.get(b.clientId) ?? { name: b.client.name, count: 0 };
    entry.count += 1;
    counts.set(b.clientId, entry);
  }

  return [...counts.entries()]
    .filter(([, v]) => v.count >= minCount)
    .map(([clientId, v]) => ({ clientId, name: v.name, count: v.count }));
}

export async function updateClientNotes(businessId: string, id: string, notes: string) {
  assertMaxLength(notes, 1000, "Las notas");
  return prisma.client.update({
    where: { id, businessId },
    data: { notes: notes || null },
  });
}
