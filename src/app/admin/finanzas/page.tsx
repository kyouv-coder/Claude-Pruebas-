import Link from "next/link";
import { listExpensesForMonth, getMonthlyFinancials, currentYearMonth } from "@/lib/finance";
import { requireAdmin } from "@/lib/auth";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseList } from "./ExpenseList";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const businessId = await requireAdmin();
  const params = await searchParams;
  const current = currentYearMonth();
  const year = Number(params.year) || current.year;
  const month = Number(params.month) || current.month;

  const [expenses, financials] = await Promise.all([
    listExpensesForMonth(businessId, year, month),
    getMonthlyFinancials(businessId, year, month),
  ]);

  const expenseRows = expenses.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    category: e.category,
    description: e.description,
    amount: Number(e.amount),
  }));

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const netColor =
    financials.net > 0 ? "text-success" : financials.net < 0 ? "text-danger" : "text-ink";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Finanzas</h1>
        <p className="text-sm text-muted mt-1">
          Registrá impuestos y otros gastos del mes para ver la ganancia neta
          real, no solo lo que entra por caja.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/admin/finanzas?year=${prev.year}&month=${prev.month}`}
          className="text-sm text-accent hover:underline"
        >
          ← Mes anterior
        </Link>
        <span className="font-display text-lg text-ink capitalize">
          {monthLabel(year, month)}
        </span>
        <Link
          href={`/admin/finanzas?year=${next.year}&month=${next.month}`}
          className="text-sm text-accent hover:underline"
        >
          Mes siguiente →
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href={`/admin/finanzas/export?year=${year}&month=${month}`}
          className="text-accent hover:underline"
        >
          ⬇ Descargar gastos del mes (CSV)
        </a>
        <a
          href={`/admin/caja/export?year=${year}&month=${month}`}
          className="text-accent hover:underline"
        >
          ⬇ Descargar ventas del mes (CSV)
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-muted">Ingresos del mes</div>
          <div className="font-display text-2xl text-ink mt-1">
            {money(financials.revenue)}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-muted">Gastos del mes</div>
          <div className="font-display text-2xl text-ink mt-1">
            {money(financials.expenses)}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-muted">Ganancia neta</div>
          <div className={`font-display text-2xl mt-1 ${netColor}`}>
            {money(financials.net)}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <section className="bg-surface border border-border rounded-lg p-5 h-fit">
          <h2 className="font-display text-lg text-ink mb-4">Registrar gasto</h2>
          <ExpenseForm />
        </section>

        <section className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display text-lg text-ink mb-4">
            Gastos de {monthLabel(year, month)} ({expenseRows.length})
          </h2>
          <ExpenseList expenses={expenseRows} />
        </section>
      </div>
    </div>
  );
}
