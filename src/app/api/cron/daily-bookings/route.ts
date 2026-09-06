import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDailyBookingsEmail, type DailyBooking } from "@/lib/email";
import { cleanupOldRateLimitAttempts } from "@/lib/maintenance";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
        time: b.startTime.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
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
