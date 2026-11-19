export class ApiError extends Error {
  status: number;
  detail: string;
  body: unknown;

  constructor(status: number, detail: string, body: unknown = null) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.body = body;
  }
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    let detail = response.statusText || "Request failed";
    if (parsed && typeof parsed === "object") {
      const rec = parsed as Record<string, unknown>;
      if (typeof rec.detail === "string") {
        detail = rec.detail;
      } else if (Array.isArray(rec.detail)) {
        detail = rec.detail
          .map((item) => (typeof item === "object" && item && "msg" in item ? String((item as { msg: string }).msg) : String(item)))
          .join("; ");
      } else if (typeof rec.message === "string") {
        detail = rec.message;
      }
    } else if (typeof parsed === "string" && parsed.trim()) {
      detail = parsed;
    }
    throw new ApiError(response.status, detail, parsed);
  }

  return parsed as T;
}

export function apiGet<T>(url: string): Promise<T> {
  return requestJson<T>(url, { method: "GET" });
}

export function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return requestJson<T>(url, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  return requestJson<T>(url, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(url: string): Promise<T> {
  return requestJson<T>(url, { method: "DELETE" });
}

export function apiPostForm<T>(url: string, formData: FormData): Promise<T> {
  return requestJson<T>(url, {
    method: "POST",
    body: formData,
  });
}
