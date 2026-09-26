import "server-only";
import { z } from "zod";
import { AuthorizationError, requireStaffAction, type StaffRole, type StaffSession } from "@/lib/auth/admin";

export type ActionResult<T = undefined> = { ok: true; data: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Wrap an admin server action: authenticate + authorise on the server,
 * validate input with Zod, and turn thrown errors into a safe result.
 * (Server actions are POST-only and origin-checked by Next.js — CSRF-safe.)
 */
export function staffAction<S extends z.ZodTypeAny, T>(
  schema: S,
  handler: (input: z.output<S>, session: StaffSession) => Promise<T | ActionResult<T>>,
  opts: { role?: StaffRole } = {},
) {
  return async (raw: z.input<S>): Promise<ActionResult<T>> => {
    try {
      const session = await requireStaffAction(opts.role ?? "staff");
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] ??= i.message;
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input", fieldErrors };
      }
      const result = await handler(parsed.data, session);
      if (result && typeof result === "object" && "ok" in (result as object)) return result as ActionResult<T>;
      return { ok: true, data: result as T };
    } catch (err) {
      if (err instanceof AuthorizationError) return { ok: false, error: err.message };
      if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
      console.error("[admin action]", err);
      return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
    }
  };
}

export const uuid = z.string().uuid();
