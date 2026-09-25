"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import {
  createService,
  updateService,
  setServiceActive,
  setServiceImage,
  createProduct,
  updateProduct,
  setProductActive,
  setProductImage,
  createStaff,
  updateStaff,
  setStaffActive,
  updateSlackWebhook,
  updateCancellationPolicy,
  updateBusinessProfile,
  setBusinessCoverImage,
} from "@/lib/settings";
import { saveBusinessHours, type DayHours } from "@/lib/business-hours";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string; success?: string };

function parsePrice(raw: FormDataEntryValue | null) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseDuration(raw: FormDataEntryValue | null) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Mismo tope que la descripción del negocio — servicios y productos no
// tenían ningún límite acá, a pesar de mostrarse en la página pública.
const MAX_DESCRIPTION_LENGTH = 800;
function assertValidDescriptionLength(description: string): string | null {
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `La descripción es demasiado larga (máximo ${MAX_DESCRIPTION_LENGTH} caracteres).`;
  }
  return null;
}

// El nombre de un servicio, producto o persona tampoco tenía tope, a pesar
// de mostrarse en la página pública y en varios desplegables del panel.
const MAX_NAME_LENGTH = 150;
function assertValidNameLength(name: string): string | null {
  if (name.length > MAX_NAME_LENGTH) {
    return `El nombre es demasiado largo (máximo ${MAX_NAME_LENGTH} caracteres).`;
  }
  return null;
}

export async function createServiceAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const durationMinutes = parseDuration(formData.get("durationMinutes"));
  const price = parsePrice(formData.get("price"));

  if (!name) return { error: "Ingresá un nombre para el servicio." };
  const nameError = assertValidNameLength(name);
  if (nameError) return { error: nameError };
  if (!durationMinutes)
    return { error: "La duración debe ser un número entero mayor a 0." };
  if (price === null) return { error: "Ingresá un precio válido." };
  const descriptionError = assertValidDescriptionLength(description);
  if (descriptionError) return { error: descriptionError };

  const businessId = await requireAdmin();

  try {
    await createService(businessId, {
      name,
      description: description || undefined,
      durationMinutes,
      price,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe un servicio con ese nombre." };
    }
    return { error: "No se pudo crear el servicio." };
  }
  revalidatePath("/admin/configuracion");
  // Igual que updateServiceAction/toggleServiceActiveAction: el servicio
  // nuevo tiene que poder elegirse de inmediato en el desplegable de
  // "Nueva reserva" sin necesitar otra navegación que revalide esa página.
  revalidatePath("/admin/reservas");
  return { success: "Servicio creado." };
}

export async function updateServiceAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const durationMinutes = parseDuration(formData.get("durationMinutes"));
  const price = parsePrice(formData.get("price"));

  if (!name) return { error: "Ingresá un nombre para el servicio." };
  const nameError = assertValidNameLength(name);
  if (nameError) return { error: nameError };
  if (!durationMinutes)
    return { error: "La duración debe ser un número entero mayor a 0." };
  if (price === null) return { error: "Ingresá un precio válido." };
  const descriptionError = assertValidDescriptionLength(description);
  if (descriptionError) return { error: descriptionError };

  const businessId = await requireAdmin();

  try {
    await updateService(businessId, id, {
      name,
      description: description || undefined,
      durationMinutes,
      price,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe un servicio con ese nombre." };
    }
    return { error: "No se pudo actualizar el servicio." };
  }
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/reservas");
  return { success: "Servicio actualizado." };
}

export async function toggleServiceActiveAction(id: string, active: boolean) {
  const businessId = await requireAdmin();
  await setServiceActive(businessId, id, active);
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/reservas");
}

export async function uploadServiceImageAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") || "");
  const file = formData.get("image");

  if (!id) return { error: "Servicio inválido." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elegí una imagen para subir." };
  }

  const businessId = await requireAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await setServiceImage(businessId, id, { type: file.type, data: buffer });
  } catch (e) {
    // findFirstOrThrow (setServiceImage) tira un P2025 con un mensaje
    // verboso de Prisma que no tiene sentido mostrarle a la usuaria — un id
    // manipulado (de otro negocio, o ya borrado) cae acá en vez de
    // relayar ese texto tal cual.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { error: "No se encontró el servicio." };
    }
    return { error: e instanceof Error ? e.message : "No se pudo subir la foto." };
  }
  revalidatePath("/admin/configuracion");
  return { success: "Foto actualizada." };
}

function parseStock(raw: FormDataEntryValue | null) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export async function createProductAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = parsePrice(formData.get("price"));
  const stock = parseStock(formData.get("stock"));

  if (!name) return { error: "Ingresá un nombre para el producto." };
  const nameError = assertValidNameLength(name);
  if (nameError) return { error: nameError };
  if (price === null) return { error: "Ingresá un precio válido." };
  if (stock === null) return { error: "El stock debe ser un número entero mayor o igual a 0." };
  const descriptionError = assertValidDescriptionLength(description);
  if (descriptionError) return { error: descriptionError };

  const businessId = await requireAdmin();

  try {
    await createProduct(businessId, { name, description: description || undefined, price, stock });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe un producto con ese nombre." };
    }
    return { error: "No se pudo crear el producto." };
  }
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/caja");
  return { success: "Producto creado." };
}

export async function updateProductAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = parsePrice(formData.get("price"));
  const stock = parseStock(formData.get("stock"));

  if (!name) return { error: "Ingresá un nombre para el producto." };
  const nameError = assertValidNameLength(name);
  if (nameError) return { error: nameError };
  if (price === null) return { error: "Ingresá un precio válido." };
  if (stock === null) return { error: "El stock debe ser un número entero mayor o igual a 0." };
  const descriptionError = assertValidDescriptionLength(description);
  if (descriptionError) return { error: descriptionError };

  const businessId = await requireAdmin();

  try {
    await updateProduct(businessId, id, { name, description: description || undefined, price, stock });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe un producto con ese nombre." };
    }
    return { error: "No se pudo actualizar el producto." };
  }
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/caja");
  return { success: "Producto actualizado." };
}

export async function toggleProductActiveAction(id: string, active: boolean) {
  const businessId = await requireAdmin();
  await setProductActive(businessId, id, active);
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/caja");
}

export async function uploadProductImageAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") || "");
  const file = formData.get("image");

  if (!id) return { error: "Producto inválido." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elegí una imagen para subir." };
  }

  const businessId = await requireAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await setProductImage(businessId, id, { type: file.type, data: buffer });
  } catch (e) {
    // Mismo motivo que uploadServiceImageAction: no relayar el mensaje
    // verboso de Prisma cuando el id no corresponde a ningún producto de
    // este negocio.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { error: "No se encontró el producto." };
    }
    return { error: e instanceof Error ? e.message : "No se pudo subir la foto." };
  }
  revalidatePath("/admin/configuracion");
  return { success: "Foto actualizada." };
}

export async function updateSlackWebhookAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const url = String(formData.get("slackWebhookUrl") || "").trim();

  if (url && !url.startsWith("https://hooks.slack.com/")) {
    return {
      error: "Tiene que ser una URL de Incoming Webhook de Slack (empieza con https://hooks.slack.com/).",
    };
  }

  const businessId = await requireAdmin();
  await updateSlackWebhook(businessId, url || null);
  revalidatePath("/admin/configuracion");
  return { success: url ? "Notificaciones de Slack activadas." : "Notificaciones de Slack desactivadas." };
}

export async function createStaffAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!name) return { error: "Ingresá un nombre." };
  const nameError = assertValidNameLength(name);
  if (nameError) return { error: nameError };
  if (!email || !email.includes("@"))
    return { error: "Ingresá un email válido." };
  if (password.length < 8)
    return { error: "La contraseña inicial debe tener al menos 8 caracteres." };
  // bcrypt trunca en silencio todo lo que pase de 72 bytes: una contraseña
  // más larga que eso da una falsa sensación de seguridad, porque el resto
  // nunca se compara ni afecta el hash.
  if (password.length > 72)
    return { error: "La contraseña inicial no puede tener más de 72 caracteres." };

  const businessId = await requireAdmin();

  try {
    await createStaff(businessId, { name, email, password });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe una persona con ese email." };
    }
    return { error: "No se pudo agregar a la persona." };
  }
  revalidatePath("/admin/configuracion");
  // Igual que toggleStaffActiveAction: la persona nueva tiene que poder
  // elegirse de inmediato como profesional en "Nueva reserva".
  revalidatePath("/admin/reservas");
  return {
    success: `Persona agregada. Compartile en privado el email y la contraseña — no queda guardada en ningún lado para volver a verla.`,
  };
}

export async function updateStaffAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!name) return { error: "Ingresá un nombre." };
  const nameError = assertValidNameLength(name);
  if (nameError) return { error: nameError };
  if (!email || !email.includes("@"))
    return { error: "Ingresá un email válido." };

  const businessId = await requireAdmin();

  try {
    await updateStaff(businessId, id, { name, email });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe una persona con ese email." };
    }
    return { error: "No se pudo actualizar la persona." };
  }
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/reservas");
  return { success: "Datos actualizados." };
}

export async function toggleStaffActiveAction(id: string, active: boolean) {
  const businessId = await requireAdmin();
  await setStaffActive(businessId, id, active);
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/reservas");
}

export async function updateCancellationPolicyAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const policy = String(formData.get("cancellationPolicy") || "").trim();
  if (policy.length > 1000) {
    return { error: "El texto es demasiado largo (máximo 1000 caracteres)." };
  }

  const businessId = await requireAdmin();
  await updateCancellationPolicy(businessId, policy || null);
  revalidatePath("/admin/configuracion");
  return { success: policy ? "Política de cancelación guardada." : "Política de cancelación eliminada." };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function updateBusinessHoursAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const days: DayHours[] = [];

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const closed = formData.get(`closed_${dayOfWeek}`) === "on";
    const openTime = String(formData.get(`open_${dayOfWeek}`) || "");
    const closeTime = String(formData.get(`close_${dayOfWeek}`) || "");

    if (!closed) {
      if (!TIME_RE.test(openTime) || !TIME_RE.test(closeTime)) {
        return { error: "Los horarios deben tener formato HH:mm." };
      }
      if (openTime >= closeTime) {
        return { error: "El horario de apertura debe ser anterior al de cierre." };
      }
    }

    days.push({
      dayOfWeek,
      openTime: closed ? "09:00" : openTime,
      closeTime: closed ? "19:00" : closeTime,
      closed,
    });
  }

  const businessId = await requireAdmin();
  await saveBusinessHours(businessId, days);
  revalidatePath("/admin/configuracion");
  return { success: "Horario de atención guardado." };
}

export async function updateBusinessProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const description = String(formData.get("description") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (description.length > 800) {
    return { error: "La descripción es demasiado larga (máximo 800 caracteres)." };
  }
  // La dirección se muestra prominente en la página pública de reserva
  // (📍 dirección) — a diferencia de la descripción, no tenía ningún límite.
  if (address.length > 300) {
    return { error: "La dirección es demasiado larga (máximo 300 caracteres)." };
  }

  const businessId = await requireAdmin();
  await updateBusinessProfile(businessId, {
    description: description || undefined,
    address: address || undefined,
  });
  revalidatePath("/admin/configuracion");
  return { success: "Datos del negocio guardados." };
}

export async function uploadBusinessCoverImageAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elegí una imagen para subir." };
  }

  const businessId = await requireAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await setBusinessCoverImage(businessId, { type: file.type, data: buffer });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo subir la foto." };
  }
  revalidatePath("/admin/configuracion");
  return { success: "Foto de portada actualizada." };
}
