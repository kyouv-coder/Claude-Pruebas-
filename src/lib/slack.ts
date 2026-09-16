// Envía un mensaje a un Incoming Webhook de Slack. Nunca lanza: una
// notificación caída no debe romper la acción de negocio que la dispara
// (crear una reserva, cobrar una venta, etc).
const WEBHOOK_TIMEOUT_MS = 5000;

export async function sendSlackNotification(
  webhookUrl: string | null | undefined,
  text: string
) {
  if (!webhookUrl) return;

  try {
    // Sin timeout, un webhook que cuelga (no falla rápido, simplemente no
    // responde) dejaba esta llamada esperando indefinidamente — y como
    // quien la invoca la espera antes de devolver éxito (crear una
    // reserva, cobrar una venta), un Slack caído de esa forma sí terminaba
    // rompiendo la acción de negocio, justo lo que este catch dice evitar.
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
  } catch {
    // Silencioso a propósito — ver comentario arriba.
  }
}
