import { timingSafeEqual } from "crypto";

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

// bcrypt trunca en silencio todo lo que pase de 72 BYTES (no caracteres) al
// hashear: el resto nunca se compara ni afecta el hash, dando una falsa
// sensación de seguridad. Las tres acciones que piden una contraseña nueva
// (signup, alta de staff, cambio de contraseña) ya comparaban
// `password.length > 72`, pero `.length` en JS cuenta unidades UTF-16, no
// bytes — una contraseña con tildes, "ñ" o emojis puede tener 72 caracteres
// o menos y superar igual los 72 bytes en UTF-8 (lo que realmente mide
// bcrypt), pasando ese chequeo sin aviso y truncándose igual. hashPassword
// no debería depender de que las tres acciones lo validen bien: por eso
// también se llama acá, mismo patrón que el resto de este archivo.
export function assertPasswordByteLength(password: string, label = "La contraseña") {
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error(`${label} no puede tener más de 72 bytes (los acentos y emojis cuentan más de uno).`);
  }
}

// El cron diario comparaba el header Authorization contra el secreto
// esperado con `!==` — una comparación de strings nativa de JS corta en
// el primer byte distinto, así que el tiempo de respuesta varía según
// cuántos caracteres iniciales coinciden. Eso deja un side-channel de
// timing: alguien sin el secreto puede ir adivinándolo carácter por
// carácter midiendo cuál intento tarda un poco más en responder.
// `crypto.timingSafeEqual` compara en tiempo constante, pero exige que
// ambos buffers tengan el mismo largo (si no, tira en vez de comparar) —
// por eso el chequeo de longitud va primero, con un valor que de todas
// formas nunca va a matchear en vez de cortar temprano revelando el largo
// real esperado del lado del atacante (el largo de `expected` siempre es
// el mismo, fijo por `CRON_SECRET`, así que no agrega información).
export function timingSafeEqualStrings(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (actualBuffer.length !== expectedBuffer.length) {
    return timingSafeEqual(expectedBuffer, expectedBuffer) && false;
  }
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

// Tanto /admin/reservas como la reserva pública parsean `startTime` con
// `new Date(\`${date}T${time}:00\`)` y ya chequean `Number.isNaN(startTime.getTime())`
// antes de llamar a createBooking — pero createBooking no debería depender de
// que ese sea el único caller, mismo motivo que el resto de los chequeos de
// este archivo. Sin esto, un Date inválido llegado por otro camino (o un
// cambio futuro en alguna de las dos actions que se olvide de validar)
// hubiera seguido de largo: el `.getTime()` de endTime da NaN, y Prisma
// recién lo rechaza al final con un error interno poco claro en vez de un
// mensaje entendible apenas se recibe el dato.
export function assertValidDate(value: Date, label: string) {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${label} no es una fecha válida.`);
  }
}
