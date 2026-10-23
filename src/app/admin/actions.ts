"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { destroySession } from "@/lib/auth";
import { logUnexpectedError } from "@/lib/log";

export async function logoutAction() {
  try {
    await destroySession();
  } catch (e) {
    unstable_rethrow(e);
    // Si falla borrar la sesión en el server, igual mandamos al usuario a
    // /login: quedarse en el error de Next sería peor que una sesión que
    // expira sola.
    logUnexpectedError(e);
  }
  redirect("/login");
}
