export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export function errorResponse(code: string, message: string, status = 400, details?: unknown) {
  return new Response(JSON.stringify({ error: { code, message, details } }), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
  });
}
