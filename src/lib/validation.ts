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

// Mismo motivo que saveBusinessHours (business-hours.ts): varios campos de
// texto libre (notas de cliente, política de cancelación, descripción y
// dirección del negocio) ya tienen un tope de largo en la acción del
// formulario, pero las funciones de lib/ que finalmente escriben en la base
// no deberían confiar en que ese sea el único caller — sin este chequeo acá
// también, un valor gigante llegado por otro camino (o un cambio futuro en
// la acción que se olvide del límite) se guardaría tal cual.
export function assertMaxLength(value: string, max: number, label: string) {
  if (value.length > max) {
    throw new Error(`${label} es demasiado largo (máximo ${max} caracteres).`);
  }
}
