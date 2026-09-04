"use client";

import { useTransition } from "react";
import { deleteExpenseAction } from "./actions";
import { categoryLabel } from "./ExpenseForm";

type Expense = {
  id: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
};

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return (
      <p className="text-sm text-muted py-4">
        No hay gastos cargados para este mes.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {expenses.map((e) => (
        <ExpenseRow key={e.id} expense={e} />
      ))}
    </div>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="py-3 flex items-center justify-between gap-4">
      <div className="text-sm">
        <div className="font-medium text-ink">
          {new Date(expense.date).toLocaleDateString("es-AR")} ·{" "}
          {categoryLabel[expense.category] ?? expense.category}
        </div>
        {expense.description && (
          <div className="text-muted">{expense.description}</div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-ink font-medium">
          {money(expense.amount)}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm("¿Eliminar este gasto?")) {
              startTransition(() => {
                deleteExpenseAction(expense.id);
              });
            }
          }}
          className="text-xs text-danger hover:underline disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
