import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { env, integrations } from "@/lib/env";

/**
 * Provider-agnostic structured generation. Every call returns data validated
 * against a Zod schema — agents never act on free-form model text.
 *
 *   Anthropic: forced tool use with the schema as the tool's input_schema.
 *   OpenAI:    chat completions with response_format json_schema.
 */
export type StructuredRequest<T extends z.ZodTypeAny> = {
  name: string; // tool/schema name, snake_case
  description: string;
  system: string;
  prompt: string;
  schema: T;
  maxTokens?: number;
  temperature?: number;
};

export type StructuredResponse<T> = { data: T; provider: "anthropic" | "openai"; model: string };

export class AiUnavailableError extends Error {
  constructor(message = "No AI provider configured") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export function aiAvailable(): boolean {
  return integrations().ai;
}

export function jsonSchemaFor(schema: z.ZodTypeAny): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

let anthropic: Anthropic | undefined;
let openai: OpenAI | undefined;

export async function generateStructured<T extends z.ZodTypeAny>(req: StructuredRequest<T>): Promise<StructuredResponse<z.infer<T>>> {
  const e = env();
  if (!aiAvailable()) throw new AiUnavailableError();
  const inputSchema = jsonSchemaFor(req.schema);

  if (e.AI_PROVIDER === "anthropic") {
    anthropic ??= new Anthropic({ apiKey: e.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 45_000 });
    const res = await anthropic.messages.create({
      model: e.ANTHROPIC_MODEL,
      max_tokens: req.maxTokens ?? 1500,
      temperature: req.temperature ?? 0.4,
      system: req.system,
      tools: [{ name: req.name, description: req.description, input_schema: inputSchema as Anthropic.Tool.InputSchema }],
      tool_choice: { type: "tool", name: req.name },
      messages: [{ role: "user", content: req.prompt }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") throw new Error("Model did not return structured output");
    return { data: validate(req.schema, block.input), provider: "anthropic", model: res.model };
  }

  if (e.AI_PROVIDER === "openai") {
    openai ??= new OpenAI({ apiKey: e.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });
    const res = await openai.chat.completions.create({
      model: e.OPENAI_MODEL,
      max_completion_tokens: req.maxTokens ?? 1500,
      messages: [
        { role: "system", content: `${req.system}\n\nRespond only with JSON matching the "${req.name}" schema.` },
        { role: "user", content: req.prompt },
      ],
      response_format: { type: "json_schema", json_schema: { name: req.name, description: req.description, schema: inputSchema, strict: false } },
    });
    const content = res.choices[0]?.message?.content;
    if (!content) throw new Error("Model returned no content");
    return { data: validate(req.schema, JSON.parse(content)), provider: "openai", model: res.model };
  }

  throw new AiUnavailableError();
}

function validate<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`AI output failed validation: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  return parsed.data;
}
