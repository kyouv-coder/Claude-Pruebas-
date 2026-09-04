"use server";

import { getBusinessBySlug, listBusyRanges } from "@/lib/public-booking";

export async function getBusyTimesAction(slug: string, staffId: string, date: string) {
  if (!staffId || !date) return [];
  const business = await getBusinessBySlug(slug);
  if (!business) return [];
  return listBusyRanges(business.id, staffId, date);
}
