export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

export function badRequest(message: string, details?: unknown) {
  return json({ error: message, details }, 400);
}

export function serverError(message = "Something went wrong") {
  return json({ error: message }, 500);
}

// Order number like: DH-4F9K2A-7C3
export function generateOrderNumber(): string {
  const t = Date.now().toString(36).toUpperCase().slice(-6);
  const r = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `DH-${t}-${r}`;
}
