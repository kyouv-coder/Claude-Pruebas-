// Antes duplicado idéntico (mismo `Number.isFinite` + comparación, distinto
// solo en el texto del campo) en finance.ts, pos.ts (tres veces) y
// settings.ts — todos protegiendo contra el mismo caso real ya reproducido
// contra la base: un monto "Infinity" o negativo/cero se guarda tal cual en
// un campo Decimal y descuadra Caja/Finanzas. Centralizado acá, mismo motivo
// que ya llevó a sacar `getClientIp` a `request.ts`: un cambio futuro en esta
// validación no debería depender de acordarse de tocar cada copia.
export function assertFiniteAmount(
  value: number,
  label: string,
  options?: { allowZero?: boolean }
) {
  const allowZero = options?.allowZero ?? false;
  const isInvalid = !Number.isFinite(value) || (allowZero ? value < 0 : value <= 0);
  if (isInvalid) {
    throw new Error(
      `${label} debe ser un número ${allowZero ? "mayor o igual a 0" : "mayor a 0"}.`
    );
  }
}
