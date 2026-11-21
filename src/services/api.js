// Talks to our own backend (same origin, /api). The JWT lives in an HttpOnly cookie,
// so JavaScript never sees it. The CSRF token is kept in memory only (not localStorage).
let csrfToken = null;
let onSessionExpired = () => {};

export const setCsrfToken = (token) => { csrfToken = token; };
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (method !== "GET" && csrfToken) headers["X-CSRF-Token"] = csrfToken;

  let response;
  try {
    response = await fetch(`/api${path}`, { method, headers, credentials: "same-origin", body: body && JSON.stringify(body) });
  } catch {
    throw new ApiError("Could not reach the server. Please check your connection and try again.", 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // A 401 on a normal request means the token expired. Login/me 401s are handled by their callers.
    if (response.status === 401 && !path.startsWith("/auth/")) onSessionExpired();
    throw new ApiError(data.error || "Something went wrong. Please try again.", response.status);
  }
  return data;
}
