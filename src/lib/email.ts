import { Resend } from "resend";

// Instanciado recién al enviar (no a nivel de módulo): Resend tira si no hay
// API key configurada, y eso rompía hasta importar este archivo para testear
// la lógica pura de armado del HTML, sin necesidad real de mandar un email.
let resend: Resend | null = null;
function getResendClient() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export type DailyBooking = {
  time: string;
  clientName: string;
  clientPhone: string | null;
  serviceName: string;
  durationMinutes: number;
  staffName: string;
};

// El nombre/teléfono del cliente vienen de un formulario público sin
// autenticar (createPublicBookingAction) — sin escapar, alguien podría
// poner HTML/JS como "nombre" y que se inyecte tal cual en el email HTML
// que recibe la dueña del negocio.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatBookingsTable(bookings: DailyBooking[]): string {
  if (bookings.length === 0) {
    return "<p>No hay reservas agendadas para hoy.</p>";
  }

  const rows = bookings
    .map((b) => {
      const time = escapeHtml(b.time);
      const clientName = escapeHtml(b.clientName);
      const clientPhone = b.clientPhone ? escapeHtml(b.clientPhone) : null;
      const serviceName = escapeHtml(b.serviceName);
      const staffName = escapeHtml(b.staffName);
      return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${time}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${clientName}${clientPhone ? ` (${clientPhone})` : ""}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${serviceName} — ${b.durationMinutes} min</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${staffName}</td>
      </tr>`;
    })
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
  to: string,
  bookings: DailyBooking[],
  dateLabel: string
) {
  await getResendClient().emails.send({
    from: process.env.EMAIL_FROM ?? "reservas@spa.local",
    to,
    subject: `Reservas de hoy (${dateLabel}) — ${bookings.length} agendadas`,
    html: `
      <h2>Agenda del día — ${dateLabel}</h2>
      ${formatBookingsTable(bookings)}
    `,
  });
}
