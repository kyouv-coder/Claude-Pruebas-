/**
 * Shared number formatting helpers. Centralized so every screen that shows
 * money (Caja, Finanzas, Clientes, Giftcards, dashboard, reserva pública)
 * renders it the same way instead of each keeping its own copy of the same
 * one-liner.
 */
export function formatCurrency(n: number): string {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

/** Fecha corta en formato es-AR (dd/mm/aaaa), sin hora. */
export function formatDate(d: Date): string {
  return d.toLocaleDateString("es-AR");
}

/** Hora corta en formato es-AR (HH:mm). */
export function formatTime(d: Date): string {
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

/** Fecha y hora completas en formato es-AR (dd/mm/aaaa, HH:mm:ss). */
export function formatDateTime(d: Date): string {
  return d.toLocaleString("es-AR");
}
