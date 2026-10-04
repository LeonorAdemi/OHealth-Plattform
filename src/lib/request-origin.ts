import "server-only";

import { headers } from "next/headers";

/** Öffentliche Adresse der App für geteilte Links. Hinter Vercel steht sie in den x-forwarded-Headern. */
export async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
