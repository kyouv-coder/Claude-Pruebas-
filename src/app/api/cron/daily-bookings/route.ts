import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDailyBookingsEmail, type DailyBooking } from "@/lib/email";
import { cleanupOldRateLimitAttempts } from "@/lib/maintenance";
import { formatTime } from "@/lib/format";
import { timingSafeEqualStrings } from "@/lib/validation";
import { logUnexpectedError } from "@/lib/log";

export async function GET(request: NextRequest) {
  // Chequeo explícito de que CRON_SECRET esté configurado: sin esto, si la
  // variable de entorno no está seteada, `Bearer ${undefined}` da
  // "Bearer undefined" — un valor adivinable que dejaría el endpoint
  // autenticable por cualquiera en vez de fallar cerrado.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  // timingSafeEqualStrings en vez de `!==`: una comparación de strings
  // nativa corta en el primer carácter distinto, filtrando por timing
  // cuántos caracteres iniciales del secreto adivinó un intento.
  if (!cronSecret || !authHeader || !timingSafeEqualStrings(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const dateLabel = startOfDay.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // One cron job, many negocios: cada uno recibe su propio resumen en el
  // email de su usuaria ADMIN, no hay un solo ADMIN_EMAIL global.
  let businesses;
  try {
    businesses = await prisma.business.findMany({
      include: {
        users: { where: { role: "ADMIN", active: true }, take: 1 },
      },
    });
  } catch (error) {
    logUnexpectedError(error);
    return NextResponse.json({ error: "Error al leer negocios" }, { status: 500 });
  }

  // La limpieza de intentos viejos es mantenimiento, no el propósito del
  // cron: si falla (p.ej. un hiccup de DB) no debe impedir que se mande el
  // resumen diario a cada negocio, que es lo que de verdad importa acá.
  let cleanup: Awaited<ReturnType<typeof cleanupOldRateLimitAttempts>> | null = null;
  try {
    cleanup = await cleanupOldRateLimitAttempts();
  } catch (error) {
    logUnexpectedError(error);
  }

  let businessesNotified = 0;
  const failedBusinessIds: string[] = [];

  for (const business of businesses) {
    const admin = business.users[0];
    if (!admin) continue;

    // Un negocio con un email inválido o un error puntual de Resend no debe
    // frenar el aviso al resto — antes, un throw acá cortaba el for entero y
    // ningún negocio siguiente recibía su resumen del día.
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          businessId: business.id,
          startTime: { gte: startOfDay, lt: endOfDay },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        orderBy: { startTime: "asc" },
        // select explícito (no `include: { staff: true }`) porque `staff`
        // es la relación a User (ver schema.prisma) — un include completo
        // trae passwordHash y los campos de bloqueo de cuenta sin
        // necesitarlos, mismo problema ya corregido en las queries de
        // listados de Staff.
        select: {
          startTime: true,
          client: { select: { name: true, phone: true } },
          service: { select: { name: true, durationMinutes: true } },
          staff: { select: { name: true } },
        },
      });

      const dailyBookings: DailyBooking[] = bookings.map((b) => ({
        time: formatTime(b.startTime),
        clientName: b.client.name,
        clientPhone: b.client.phone,
        serviceName: b.service.name,
        durationMinutes: b.service.durationMinutes,
        staffName: b.staff.name,
      }));

      await sendDailyBookingsEmail(admin.email, dailyBookings, dateLabel);
      businessesNotified++;
    } catch (error) {
      // Mismo motivo que el resto de las acciones del sitio (ver
      // logUnexpectedError, src/lib/log.ts): un console.error suelto acá no
      // llega a Sentry aunque el DSN esté configurado, perdiendo la traza de
      // qué negocio no recibió su resumen diario y por qué.
      logUnexpectedError(error);
      failedBusinessIds.push(business.id);
    }
  }

  return NextResponse.json({ businessesNotified, failedBusinessIds, ...(cleanup ?? {}) });
}
