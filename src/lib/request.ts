import { headers } from "next/headers";

// Repetida antes idéntica en signup/actions.ts, login/actions.ts y
// reservar/[slug]/actions.ts (los tres puntos con rate limiting por IP) —
// centralizada acá para que un cambio futuro (otro header de proxy, otra
// prioridad) no dependa de acordarse de tocar las tres copias a la vez.
export async function getClientIp() {
  const headerList = await headers();
  // x-real-ip lo pone la plataforma de deploy (Vercel) directamente, sin
  // que el cliente pueda sobreescribirlo — se prioriza sobre
  // x-forwarded-for, que un cliente puede mandar con un valor propio si
  // el proxy no lo sanitiza antes de reenviarlo a la app.
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}
