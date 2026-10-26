/**
 * Runs once when the server starts. Validates the environment so a
 * misconfigured deployment fails immediately with a readable message (spec §17).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("@/lib/env");
    getEnv();
    if (process.env.SENTRY_DSN) {
      console.log("[observability] SENTRY_DSN is set — wire @sentry/nextjs here to enable error reporting.");
    }
  }
}

/** Structured request-error logging (spec §12 observability). */
export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routerKind: string; routePath: string; routeType: string }) {
  const e = err as { message?: string; digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      msg: "request_error",
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
      digest: e?.digest,
      error: e?.message,
    })
  );
}
