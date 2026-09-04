"use server";

import { revalidatePath } from "next/cache";
import {
  createService,
  updateService,
  setServiceActive,
  createStaff,
  updateStaff,
  setStaffActive,
} from "@/lib/settings";

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

  try {
    await createService({
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

  try {
    await updateService(id, {
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
  await setServiceActive(id, active);
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/reservas");
}

export async function createStaffAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!name) return { error: "Ingresá un nombre." };
  if (!email || !email.includes("@"))
    return { error: "Ingresá un email válido." };

  try {
    await createStaff({ name, email });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return { error: "Ya existe una persona con ese email." };
    }
    return { error: "No se pudo agregar a la persona." };
  }
  revalidatePath("/admin/configuracion");
  return { success: "Persona agregada al staff." };
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

  try {
    await updateStaff(id, { name, email });
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
  await setStaffActive(id, active);
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/reservas");
}
