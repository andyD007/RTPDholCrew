import "server-only";
import type { z } from "zod";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { aiAvailable, generateStructured, type StructuredRequest } from "@/lib/ai/provider";
import type { Json } from "@/types/database";
import type { AgentName } from "./types";

export type AgentRun<T> = { generationId: string; output: T; provider: string; model: string | null; usedFallback: boolean; error?: string };

/**
 * Run an agent: try the configured model, validate with the schema, fall back
 * to the deterministic implementation on any failure, and persist the result
 * to `ai_generations` for review/audit.
 */
export async function runAgent<S extends z.ZodTypeAny>(
  db: TypedSupabaseClient,
  opts: {
    agent: AgentName;
    request: StructuredRequest<S>;
    fallback: () => z.infer<S>;
    input: Record<string, unknown>;
    leadId?: string | null;
    bookingId?: string | null;
    mediaId?: string | null;
    showcaseId?: string | null;
  },
): Promise<AgentRun<z.infer<S>>> {
  let output: z.infer<S>;
  let provider = "rules";
  let model: string | null = null;
  let error: string | undefined;
  let usedFallback = true;

  if (aiAvailable()) {
    try {
      const res = await generateStructured(opts.request);
      output = res.data;
      provider = res.provider;
      model = res.model;
      usedFallback = false;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.warn(`[agent:${opts.agent}] AI failed, using rules fallback:`, error);
      output = opts.request.schema.parse(opts.fallback());
    }
  } else {
    output = opts.request.schema.parse(opts.fallback());
  }

  const { data, error: dbErr } = await db
    .from("ai_generations")
    .insert({
      agent: opts.agent,
      lead_id: opts.leadId ?? null,
      booking_id: opts.bookingId ?? null,
      media_id: opts.mediaId ?? null,
      showcase_id: opts.showcaseId ?? null,
      input: opts.input as Json,
      output: output as Json,
      provider,
      model,
      status: "completed",
      error: error ?? null,
    })
    .select("id")
    .single();
  if (dbErr) throw new Error(`Failed to store ${opts.agent} output: ${dbErr.message}`);
  return { generationId: data.id, output, provider, model, usedFallback, error };
}
