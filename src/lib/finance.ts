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

  const results = await Promise.all(
    months.map(async (m) => {
      const financials = await getMonthlyFinancials(businessId, m.year, m.month);
      return { ...m, ...financials };
    })
  );

  return results;
}
