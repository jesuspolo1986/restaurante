/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const tenantId = typeof window !== "undefined" ? (localStorage.getItem("tenant_id") || "default") : "default";
  const newInit = { ...(init || {}) };
  const headers = new Headers(newInit.headers || {});
  
  const urlStr = typeof input === "string" 
    ? input 
    : input instanceof URL 
      ? input.toString() 
      : input.url;
      
  if (urlStr.startsWith("/api") || urlStr.includes("/api/")) {
    headers.set("x-tenant-id", tenantId);
  }
  
  newInit.headers = headers;
  return fetch(input, newInit);
}
