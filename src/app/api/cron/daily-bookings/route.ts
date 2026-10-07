import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDailyBookingsEmail, type DailyBooking } from "@/lib/email";
import { cleanupOldRateLimitAttempts } from "@/lib/maintenance";
import { formatTime } from "@/lib/format";
import { timingSafeEqualStrings } from "@/lib/validation";

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
  const businesses = await prisma.business.findMany({
    include: {
      users: { where: { role: "ADMIN", active: true }, take: 1 },
    },
  });

  const cleanup = await cleanupOldRateLimitAttempts();

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
        include: { client: true, service: true, staff: true },
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
      console.error(`No se pudo notificar al negocio ${business.id}:`, error);
      failedBusinessIds.push(business.id);
    }
  }

  return NextResponse.json({ businessesNotified, failedBusinessIds, ...cleanup });
}
