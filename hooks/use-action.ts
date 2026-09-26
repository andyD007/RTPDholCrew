"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";

type Result<T> = { ok: true; data: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Run a server action with pending state, toast feedback and a router refresh.
 * Returns the result so callers can react to field errors.
 */
export function useServerAction<I, T>(action: (input: I) => Promise<Result<T>>, opts: { success?: string | ((data: T) => string); refresh?: boolean } = {}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = useCallback(
    (input: I) =>
      new Promise<Result<T>>((resolve) => {
        start(async () => {
          try {
            const res = await action(input);
            if (res.ok) {
              const msg = res.message ?? (typeof opts.success === "function" ? opts.success(res.data) : opts.success);
              if (msg) toast.success(msg);
              if (opts.refresh !== false) router.refresh();
            } else {
              toast.error(res.error);
            }
            resolve(res);
          } catch (err) {
            const error = err instanceof Error ? err.message : "Something went wrong";
            toast.error(error);
            resolve({ ok: false, error });
          }
        });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, router],
  );
  return { run, pending };
}
