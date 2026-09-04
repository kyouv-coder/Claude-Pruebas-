// Envía un mensaje a un Incoming Webhook de Slack. Nunca lanza: una
// notificación caída no debe romper la acción de negocio que la dispara
// (crear una reserva, cobrar una venta, etc).
export async function sendSlackNotification(
  webhookUrl: string | null | undefined,
  text: string
) {
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Silencioso a propósito — ver comentario arriba.
  }
}
