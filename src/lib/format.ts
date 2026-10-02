/**
 * Shared number formatting helpers. Centralized so every screen that shows
 * money (Caja, Finanzas, Clientes, Giftcards, dashboard, reserva pública)
 * renders it the same way instead of each keeping its own copy of the same
 * one-liner.
 */
export function formatCurrency(n: number): string {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}
