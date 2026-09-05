import { prisma } from "@/lib/prisma";
import type { ExpenseCategory } from "@/generated/prisma";

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
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

export async function getYearlyTrend(businessId: string, yearsBack = 3) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: yearsBack }, (_, i) => currentYear - (yearsBack - 1 - i));

  return Promise.all(
    years.map(async (year) => ({
      year,
      label: String(year),
      ...(await getYearlyFinancials(businessId, year)),
    }))
  );
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

  const results = await Promise.all(
    months.map(async (m) => {
      const financials = await getMonthlyFinancials(businessId, m.year, m.month);
      return { ...m, ...financials };
    })
  );

  return results;
}
