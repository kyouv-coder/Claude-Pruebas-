import { prisma } from "@/lib/prisma";
import type { ExpenseCategory } from "@/generated/prisma";
import { assertFiniteAmount, assertMaxLength, assertValidDate } from "@/lib/validation";

// Re-exportado desde validation.ts (donde vive ahora, compartido con
// csv.ts) para no romper a quien ya la importaba desde acá.
export { sanitizeFileNameForHeader } from "@/lib/validation";

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// Año/mes vienen de un query param editable a mano en la URL (?year=&month=)
// en tres lugares (la página de Finanzas y sus dos exports CSV). Sin
// validar, un month=13 o month=-5 no falla — Date normaliza silenciosamente
// a un año/mes distinto del que la pantalla dice estar mostrando. Cualquier
// valor fuera de rango cae al mes actual en vez de mostrar datos de un
// período equivocado.
export function resolveYearMonth(
  yearParam: string | null | undefined,
  monthParam: string | null | undefined
) {
  const current = currentYearMonth();
  const year = Number(yearParam);
  const month = Number(monthParam);
  return {
    year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : current.year,
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : current.month,
  };
}

export async function listExpensesForMonth(
  businessId: string,
  year: number,
  month: number
) {
  const { start, end } = monthRange(year, month);
  return prisma.expense.findMany({
    where: { businessId, date: { gte: start, lt: end } },
    orderBy: { date: "desc" },
  });
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  IMPUESTOS: "Impuestos",
  ALQUILER: "Alquiler",
  INSUMOS: "Insumos",
  SUELDOS: "Sueldos",
  SERVICIOS: "Servicios (luz, agua, etc.)",
  OTRO: "Otro",
};

export async function getExpensesByCategory(businessId: string, year: number, month: number) {
  const { start, end } = monthRange(year, month);
  const expenses = await prisma.expense.groupBy({
    by: ["category"],
    where: { businessId, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });

  return expenses
    .map((e) => ({
      category: e.category,
      label: CATEGORY_LABELS[e.category],
      amount: Number(e._sum.amount ?? 0),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function createExpense(
  businessId: string,
  input: {
    date: Date;
    category: ExpenseCategory;
    description?: string;
    amount: number;
  }
) {
  // Mismo motivo que en pos.ts (sellProduct, redeemGiftCard,
  // openCashSession, closeCashSession): la acción del formulario ya valida
  // esto, pero esta función no debería confiar en el caller — "Infinity" o
  // un monto negativo/cero se guardarían tal cual en un campo Decimal y
  // descuadrarían Finanzas.
  assertFiniteAmount(input.amount, "El monto");
  if (input.description) {
    assertMaxLength(input.description, 500, "La descripción");
  }
  // Mismo motivo que startTime en createBooking: la acción ya valida que
  // `date` sea una fecha real, pero esta función no debería depender de que
  // ese sea el único caller. Sin este chequeo, un Date inválido se guardaría
  // tal cual y listExpensesForMonth (que filtra por rango de fechas) nunca
  // lo mostraría, perdiendo el gasto sin ningún error visible.
  assertValidDate(input.date, "La fecha del gasto");

  return prisma.expense.create({
    data: {
      businessId,
      date: input.date,
      category: input.category,
      description: input.description || null,
      amount: input.amount,
    },
  });
}

export async function deleteExpense(businessId: string, id: string) {
  return prisma.expense.delete({ where: { id, businessId } });
}

export async function getMonthlyFinancials(
  businessId: string,
  year: number,
  month: number
) {
  const { start, end } = monthRange(year, month);

  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId, createdAt: { gte: start, lt: end } },
      select: { total: true },
    }),
    prisma.expense.findMany({
      where: { businessId, date: { gte: start, lt: end } },
      select: { amount: true },
    }),
  ]);

  const revenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    revenue,
    expenses: totalExpenses,
    net: revenue - totalExpenses,
    salesCount: sales.length,
    expensesCount: expenses.length,
  };
}

export async function listSalesForMonth(businessId: string, year: number, month: number) {
  const { start, end } = monthRange(year, month);
  return prisma.sale.findMany({
    where: { businessId, createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "desc" },
    include: { client: true, items: true },
    // El archivo del comprobante puede pesar varios MB — nunca lo traemos
    // en un listado, solo cuando se pide puntualmente (ver getSaleInvoiceFile).
    omit: { invoiceFileData: true },
  });
}

const ALLOWED_INVOICE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_INVOICE_SIZE_BYTES = 5 * 1024 * 1024;

// El "type" declarado es el `.type` del File elegido por quien sube el
// archivo, no algo confiable por sí solo — mismo motivo que
// setServiceImage/setProductImage (src/lib/settings.ts) ya chequean los
// primeros bytes reales del archivo, no solo el tipo que dice traer.
function matchesDeclaredInvoiceSignature(type: string, data: Buffer): boolean {
  if (type === "image/jpeg") {
    return data.byteLength >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (type === "image/png") {
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return data.byteLength >= 8 && pngSignature.every((byte, i) => data[i] === byte);
  }
  if (type === "application/pdf") {
    return data.byteLength >= 4 && data.subarray(0, 4).toString("ascii") === "%PDF";
  }
  return false;
}

export async function attachSaleInvoice(
  businessId: string,
  saleId: string,
  file: { name: string; type: string; data: Buffer }
) {
  if (!ALLOWED_INVOICE_TYPES.includes(file.type)) {
    throw new Error("Solo se aceptan imágenes (JPG/PNG) o PDF.");
  }
  if (file.data.byteLength > MAX_INVOICE_SIZE_BYTES) {
    throw new Error("El archivo no puede pesar más de 5 MB.");
  }
  if (!matchesDeclaredInvoiceSignature(file.type, file.data)) {
    throw new Error("El archivo no parece ser válido para el tipo indicado.");
  }

  await prisma.sale.findFirstOrThrow({ where: { id: saleId, businessId } });

  return prisma.sale.update({
    where: { id: saleId },
    data: {
      invoiceFileName: file.name,
      invoiceMimeType: file.type,
      invoiceFileData: file.data,
      invoiceUploadedAt: new Date(),
    },
  });
}

export async function getSaleInvoiceFile(businessId: string, saleId: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, businessId },
    select: { invoiceFileName: true, invoiceMimeType: true, invoiceFileData: true },
  });
  if (!sale || !sale.invoiceFileData || !sale.invoiceMimeType) return null;
  return {
    fileName: sale.invoiceFileName || "comprobante",
    mimeType: sale.invoiceMimeType,
    data: sale.invoiceFileData,
  };
}

function yearRange(year: number) {
  return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
}

export async function getYearlyFinancials(businessId: string, year: number) {
  const { start, end } = yearRange(year);

  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId, createdAt: { gte: start, lt: end } },
      select: { total: true },
    }),
    prisma.expense.findMany({
      where: { businessId, date: { gte: start, lt: end } },
      select: { amount: true },
    }),
  ]);

  const revenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    revenue,
    expenses: totalExpenses,
    net: revenue - totalExpenses,
    salesCount: sales.length,
    expensesCount: expenses.length,
  };
}

// getYearlyTrend/getMonthlyTrend se llaman desde el dashboard (este último
// dos veces, para 6 y 12 meses) en la misma carga de página. Antes, cada
// período hacía su propio par de queries (sales + expenses) en paralelo,
// así que 3 años u 12 meses significaban 6 o 24 queries para una sola
// pantalla. Acá se trae todo el rango necesario en un único par de queries
// (select mínimo: total/amount + fecha) y se bucketea en memoria, sin
// importar cuántos años/meses pida el caller.
export async function getYearlyTrend(businessId: string, yearsBack = 3) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: yearsBack }, (_, i) => currentYear - (yearsBack - 1 - i));
  const start = new Date(years[0], 0, 1);
  const end = new Date(years[years.length - 1] + 1, 0, 1);

  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId, createdAt: { gte: start, lt: end } },
      select: { total: true, createdAt: true },
    }),
    prisma.expense.findMany({
      where: { businessId, date: { gte: start, lt: end } },
      select: { amount: true, date: true },
    }),
  ]);

  return years.map((year) => {
    const yearSales = sales.filter((s) => s.createdAt.getFullYear() === year);
    const yearExpenses = expenses.filter((e) => e.date.getFullYear() === year);
    const revenue = yearSales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalExpenses = yearExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      year,
      label: String(year),
      revenue,
      expenses: totalExpenses,
      net: revenue - totalExpenses,
      salesCount: yearSales.length,
      expensesCount: yearExpenses.length,
    };
  });
}

export async function getMonthlyTrend(businessId: string, monthsBack = 6) {
  const now = new Date();
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
    });
  }

  const start = new Date(months[0].year, months[0].month - 1, 1);
  const end = new Date(months[months.length - 1].year, months[months.length - 1].month, 1);

  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId, createdAt: { gte: start, lt: end } },
      select: { total: true, createdAt: true },
    }),
    prisma.expense.findMany({
      where: { businessId, date: { gte: start, lt: end } },
      select: { amount: true, date: true },
    }),
  ]);

  return months.map((m) => {
    const monthSales = sales.filter(
      (s) => s.createdAt.getFullYear() === m.year && s.createdAt.getMonth() + 1 === m.month
    );
    const monthExpenses = expenses.filter(
      (e) => e.date.getFullYear() === m.year && e.date.getMonth() + 1 === m.month
    );
    const revenue = monthSales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalExpenses = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      ...m,
      revenue,
      expenses: totalExpenses,
      net: revenue - totalExpenses,
      salesCount: monthSales.length,
      expensesCount: monthExpenses.length,
    };
  });
}
