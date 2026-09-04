import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type DailyBooking = {
  time: string;
  clientName: string;
  clientPhone: string | null;
  serviceName: string;
  durationMinutes: number;
  staffName: string;
};

function formatBookingsTable(bookings: DailyBooking[]): string {
  if (bookings.length === 0) {
    return "<p>No hay reservas agendadas para hoy.</p>";
  }

  const rows = bookings
    .map(
      (b) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${b.time}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${b.clientName}${b.clientPhone ? ` (${b.clientPhone})` : ""}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${b.serviceName} — ${b.durationMinutes} min</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${b.staffName}</td>
      </tr>`
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      <thead>
        <tr style="text-align:left;background:#f5f5f5;">
          <th style="padding:8px;">Hora</th>
          <th style="padding:8px;">Cliente</th>
          <th style="padding:8px;">Servicio</th>
          <th style="padding:8px;">Profesional</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export async function sendDailyBookingsEmail(
  bookings: DailyBooking[],
  dateLabel: string
) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    throw new Error("ADMIN_EMAIL no está configurado");
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "reservas@spa.local",
    to,
    subject: `Reservas de hoy (${dateLabel}) — ${bookings.length} agendadas`,
    html: `
      <h2>Agenda del día — ${dateLabel}</h2>
      ${formatBookingsTable(bookings)}
    `,
  });
}
