"use server";

import { revalidatePath } from "next/cache";
import {
  createService,
  updateService,
  setServiceActive,
  setServiceImage,
  createProduct,
  updateProduct,
  setProductActive,
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

export async function createServiceAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const durationMinutes = parseDuration(formData.get("durationMinutes"));
  const price = parsePrice(formData.get("price"));

  if (!name) return { error: "Ingresá un nombre para el servicio." };
  if (!durationMinutes)
    return { error: "La duración debe ser un número entero mayor a 0." };
  if (price === null) return { error: "Ingresá un precio válido." };

  const businessId = await requireAdmin();

  try {
    await createService(businessId, {
      name,
      description: description || undefined,
      durationMinutes,
      price,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return { error: "Ya existe un servicio con ese nombre." };
    }
    return { error: "No se pudo crear el servicio." };
  }
  revalidatePath("/admin/configuracion");
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
  if (!durationMinutes)
    return { error: "La duración debe ser un número entero mayor a 0." };
  if (price === null) return { error: "Ingresá un precio válido." };

  const businessId = await requireAdmin();

  try {
    await updateService(businessId, id, {
      name,
      description: description || undefined,
      durationMinutes,
      price,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
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
  const price = parsePrice(formData.get("price"));
  const stock = parseStock(formData.get("stock"));

  if (!name) return { error: "Ingresá un nombre para el producto." };
  if (price === null) return { error: "Ingresá un precio válido." };
  if (stock === null) return { error: "El stock debe ser un número entero mayor o igual a 0." };

  const businessId = await requireAdmin();

  try {
    await createProduct(businessId, { name, price, stock });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
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
  const price = parsePrice(formData.get("price"));
  const stock = parseStock(formData.get("stock"));

  if (!name) return { error: "Ingresá un nombre para el producto." };
  if (price === null) return { error: "Ingresá un precio válido." };
  if (stock === null) return { error: "El stock debe ser un número entero mayor o igual a 0." };

  const businessId = await requireAdmin();

  try {
    await updateProduct(businessId, id, { name, price, stock });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
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
  if (!email || !email.includes("@"))
    return { error: "Ingresá un email válido." };
  if (password.length < 8)
    return { error: "La contraseña inicial debe tener al menos 8 caracteres." };

  const businessId = await requireAdmin();

  try {
    await createStaff(businessId, { name, email, password });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return { error: "Ya existe una persona con ese email." };
    }
    return { error: "No se pudo agregar a la persona." };
  }
  revalidatePath("/admin/configuracion");
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
  if (!email || !email.includes("@"))
    return { error: "Ingresá un email válido." };

  const businessId = await requireAdmin();

  try {
    await updateStaff(businessId, id, { name, email });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return { error: "Ya existe una persona con ese email." };
    }
    return { error: "No se pudo actualizar la persona." };
  }
  revalidatePath("/admin/configuracion");
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
