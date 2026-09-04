import { listClients, listFrequentNoShowClients } from "@/lib/clients";
import { listAllProducts } from "@/lib/settings";
import { listGiftCards } from "@/lib/giftcards";
import { getMonthlyFinancials, currentYearMonth, listSalesForMonth } from "@/lib/finance";
import { getLastClosedCashSession } from "@/lib/pos";

export type Recommendation = {
  severity: "alta" | "media" | "info";
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

const INACTIVE_DAYS_THRESHOLD = 60;
const GIFTCARD_EXPIRY_WARNING_DAYS = 30;
const LOW_STOCK_THRESHOLD = 3;

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getRecommendations(businessId: string): Promise<Recommendation[]> {
  const now = new Date();
  const { year, month } = currentYearMonth();

  const [
    clients,
    products,
    giftCards,
    financials,
    lastClosedSession,
    salesThisMonth,
    frequentNoShows,
  ] = await Promise.all([
    listClients(businessId),
    listAllProducts(businessId),
    listGiftCards(businessId),
    getMonthlyFinancials(businessId, year, month),
    getLastClosedCashSession(businessId),
    listSalesForMonth(businessId, year, month),
    listFrequentNoShowClients(businessId),
  ]);

  const recommendations: Recommendation[] = [];

  // Clientes que dejaron de venir
  const inactiveClients = clients.filter(
    (c) => c.lastVisit && daysBetween(now, c.lastVisit) >= INACTIVE_DAYS_THRESHOLD
  );
  if (inactiveClients.length > 0) {
    recommendations.push({
      severity: "media",
      title: `${inactiveClients.length} cliente${inactiveClients.length > 1 ? "s" : ""} sin volver hace más de ${INACTIVE_DAYS_THRESHOLD} días`,
      description: `${inactiveClients
        .slice(0, 5)
        .map((c) => c.name)
        .join(", ")}${inactiveClients.length > 5 ? "…" : ""}. Un mensaje de recontacto o una promo puede recuperarlos antes de que se vayan a la competencia.`,
      href: "/admin/clientes",
      linkLabel: "Ver clientes",
    });
  }

  // Stock bajo
  const lowStock = products.filter((p) => p.active && p.stock <= LOW_STOCK_THRESHOLD);
  if (lowStock.length > 0) {
    recommendations.push({
      severity: lowStock.some((p) => p.stock === 0) ? "alta" : "media",
      title: `${lowStock.length} producto${lowStock.length > 1 ? "s" : ""} con stock bajo`,
      description: lowStock
        .map((p) => `${p.name} (${p.stock} unidades)`)
        .join(", "),
      href: "/admin/configuracion",
      linkLabel: "Reponer stock",
    });
  }

  // Giftcards por vencer con saldo
  const expiringSoon = giftCards.filter((g) => {
    if (!g.active || Number(g.balance) <= 0 || !g.expiresAt) return false;
    const daysLeft = daysBetween(g.expiresAt, now);
    return daysLeft >= 0 && daysLeft <= GIFTCARD_EXPIRY_WARNING_DAYS;
  });
  if (expiringSoon.length > 0) {
    const totalAtRisk = expiringSoon.reduce((sum, g) => sum + Number(g.balance), 0);
    recommendations.push({
      severity: "media",
      title: `${expiringSoon.length} giftcard${expiringSoon.length > 1 ? "s" : ""} por vencer en los próximos ${GIFTCARD_EXPIRY_WARNING_DAYS} días`,
      description: `Suman ${money(totalAtRisk)} de saldo pendiente. Avisale al cliente antes de que venza — es plata que ya cobraste y no querés perder la buena relación por una letra chica.`,
      href: "/admin/giftcards",
      linkLabel: "Ver giftcards",
    });
  }

  // Mes en rojo
  if (financials.net < 0) {
    recommendations.push({
      severity: "alta",
      title: "Este mes vas con pérdida",
      description: `Ingresos ${money(financials.revenue)} contra gastos ${money(
        financials.expenses
      )}: ${money(financials.net)} de resultado. Revisá qué gasto es el más grande antes de fin de mes.`,
      href: "/admin/finanzas",
      linkLabel: "Ver finanzas",
    });
  }

  // Diferencia de caja sin explicar
  if (
    lastClosedSession?.closingAmount != null &&
    lastClosedSession.expectedCashAmount != null
  ) {
    const diff = Number(lastClosedSession.closingAmount) - Number(lastClosedSession.expectedCashAmount);
    if (diff !== 0) {
      recommendations.push({
        severity: Math.abs(diff) > 5000 ? "alta" : "media",
        title: `${diff > 0 ? "Sobrante" : "Faltante"} de ${money(Math.abs(diff))} en el último cierre de caja`,
        description: `Cerrada el ${lastClosedSession.closedAt!.toLocaleDateString("es-AR")}. Vale la pena revisar con quien estuvo en el turno qué pudo haber pasado.`,
        href: "/admin/caja",
        linkLabel: "Ver caja",
      });
    }
  }

  // Clientes con no-shows repetidos
  if (frequentNoShows.length > 0) {
    recommendations.push({
      severity: "media",
      title: `${frequentNoShows.length} cliente${frequentNoShows.length > 1 ? "s" : ""} con no-shows repetidos`,
      description: `${frequentNoShows
        .map((c) => `${c.name} (${c.count})`)
        .join(", ")}. Considerá pedir seña por adelantado para las próximas reservas de estos clientes.`,
      href: "/admin/clientes",
      linkLabel: "Ver clientes",
    });
  }

  // Facturación electrónica pendiente
  if (salesThisMonth.length > 0) {
    recommendations.push({
      severity: "info",
      title: "Facturación electrónica todavía no está integrada",
      description: `Este mes se registraron ${salesThisMonth.length} ventas acá, pero el sistema no emite comprobante fiscal — seguís necesitando otro sistema en paralelo para eso. Es la brecha más grande para dejar de usar herramientas separadas.`,
    });
  }

  const severityOrder = { alta: 0, media: 1, info: 2 };
  return recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
