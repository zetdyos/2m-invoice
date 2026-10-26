// Thin fetch wrapper. Adds the JWT and centralises error handling.
const TOKEN_KEY = "invoicer_token";

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

async function request(method, path, body) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, opts);
  if (res.status === 401) { onUnauthorized(); throw new ApiError("Session expired", 401); }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError((data && data.detail) || "Request failed", res.status);
  return data;
}

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b),
  put: (p, b) => request("PUT", p, b),
  del: (p) => request("DELETE", p),
};

export function pdfUrl(id) { return `/api/confirmations/${id}/pdf`; }

// The PDF endpoint is JWT-protected, so a plain <a href> navigation (no Authorization
// header) returns 401. Fetch it with the token and open the result as a blob instead.
export async function openPdf(id) {
  const win = window.open("", "_blank"); // open synchronously to avoid popup blocking
  try {
    const token = getToken();
    const res = await fetch(`/api/confirmations/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 401) { if (win) win.close(); onUnauthorized(); throw new ApiError("Session expired", 401); }
    if (!res.ok) { if (win) win.close(); throw new ApiError("Could not load the PDF", res.status); }
    const url = URL.createObjectURL(await res.blob());
    if (win) win.location = url; else window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    if (win && !win.closed) win.close();
    throw e;
  }
}
