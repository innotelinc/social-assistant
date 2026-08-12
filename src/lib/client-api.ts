// Client-side API helpers.

interface ApiError {
  error?: string;
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as ApiError | T;
  if (!res.ok) {
    throw new Error((data as ApiError)?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const post = <T = unknown>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const put = <T = unknown>(path: string, body?: unknown) =>
  api<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });

export const del = <T = unknown>(path: string) => api<T>(path, { method: "DELETE" });
