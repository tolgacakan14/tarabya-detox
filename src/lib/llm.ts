// Provider-agnostic chat with tool calling.
// Free options first: Groq (GROQ_API_KEY) or Google Gemini (GEMINI_API_KEY), both via OpenAI-compatible APIs.
// Anthropic (ANTHROPIC_API_KEY) is also supported if present.

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type Msg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
  | { role: "tool"; tool_call_id: string; content: string };

interface Provider {
  name: string;
  base: string;
  key: string;
  preferred: string[];
  override?: string;
}

function provider(): Provider | null {
  if (process.env.GROQ_API_KEY)
    return {
      name: "groq",
      base: "https://api.groq.com/openai/v1",
      key: process.env.GROQ_API_KEY,
      override: process.env.GROQ_MODEL,
      preferred: ["moonshotai/kimi-k2-instruct-0905", "moonshotai/kimi-k2-instruct", "openai/gpt-oss-120b", "llama-3.3-70b-versatile", "qwen/qwen3-32b", "openai/gpt-oss-20b"],
    };
  if (process.env.GEMINI_API_KEY)
    return {
      name: "gemini",
      base: "https://generativelanguage.googleapis.com/v1beta/openai",
      key: process.env.GEMINI_API_KEY,
      override: process.env.GEMINI_MODEL,
      preferred: ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash"],
    };
  return null;
}

export const hasAI = () => !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);

const g = globalThis as unknown as { __llmModel?: Record<string, string> };
const chosen = (g.__llmModel ??= {});

async function pickModel(p: Provider): Promise<string> {
  if (p.override) return p.override;
  if (chosen[p.name]) return chosen[p.name];
  try {
    const r = await fetch(`${p.base}/models`, { headers: { Authorization: `Bearer ${p.key}` } });
    if (r.ok) {
      const j = (await r.json()) as { data?: { id: string }[] };
      const ids = (j.data ?? []).map((m) => m.id.replace(/^models\//, ""));
      const hit = p.preferred.find((m) => ids.includes(m));
      if (hit) return (chosen[p.name] = hit);
      const any = ids.find((m) => (p.name === "gemini" ? /flash/.test(m) && !/image|tts|audio|live|embed/.test(m) : !/whisper|guard|tts|embed/.test(m)));
      if (any) return (chosen[p.name] = any);
    }
  } catch {
    /* fall through */
  }
  return (chosen[p.name] = p.preferred[0]);
}

/** Runs a tool-using conversation until the model answers in text. */
export async function runChat(opts: {
  system: string;
  history: { role: "user" | "assistant"; content: string }[];
  tools: ToolDef[];
  exec: (call: ToolCall) => Promise<string>;
  maxTurns?: number;
}): Promise<{ text: string; usedTools: boolean }> {
  if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) return runOpenAICompat(opts);
  if (process.env.ANTHROPIC_API_KEY) return runAnthropic(opts);
  throw new Error("AI anahtarı tanımlı değil");
}

async function runOpenAICompat(opts: Parameters<typeof runChat>[0]) {
  const p = provider()!;
  const model = await pickModel(p);
  const tools = opts.tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  const messages: Msg[] = [{ role: "system", content: opts.system }, ...opts.history];
  let usedTools = false;
  let text = "";
  for (let i = 0; i < (opts.maxTurns ?? 5); i++) {
    const r = await fetch(`${p.base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, tools, tool_choice: "auto", temperature: 0.5, max_tokens: 1000 }),
    });
    if (!r.ok) {
      const body = await r.text();
      if (r.status === 429) throw new Error("Ücretsiz kota şu an dolu, birkaç dakika sonra tekrar dene.");
      if (r.status === 404 || /model/i.test(body)) delete chosen[p.name];
      throw new Error(`${p.name} ${r.status}: ${body.slice(0, 200)}`);
    }
    const j = (await r.json()) as {
      choices: { message: { content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }; finish_reason: string }[];
    };
    const m = j.choices[0].message;
    if (m.content) text = stripThinking(m.content);
    if (!m.tool_calls?.length) break;
    usedTools = true;
    messages.push({ role: "assistant", content: m.content ?? null, tool_calls: m.tool_calls });
    for (const c of m.tool_calls) {
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(c.function.arguments || "{}");
      } catch {
        /* ignore malformed args */
      }
      let out: string;
      try {
        out = await opts.exec({ id: c.id, name: c.function.name, input });
      } catch (e) {
        out = "Hata: " + (e as Error).message;
      }
      messages.push({ role: "tool", tool_call_id: c.id, content: out });
    }
  }
  return { text, usedTools };
}

function stripThinking(s: string) {
  return s.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

async function runAnthropic(opts: Parameters<typeof runChat>[0]) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  type AMsg = { role: "user" | "assistant"; content: unknown };
  const messages: AMsg[] = [...opts.history];
  let usedTools = false;
  let text = "";
  for (let i = 0; i < (opts.maxTurns ?? 5); i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await client.messages.create({ model, max_tokens: 1200, system: opts.system, tools: opts.tools as any, messages: messages as any });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = res.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
    if (t) text = t;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uses = res.content.filter((c: any) => c.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !uses.length) break;
    usedTools = true;
    messages.push({ role: "assistant", content: res.content });
    const results = [];
    for (const u of uses) {
      let out: string;
      try {
        out = await opts.exec({ id: u.id, name: u.name, input: u.input });
      } catch (e) {
        out = "Hata: " + (e as Error).message;
      }
      results.push({ type: "tool_result", tool_use_id: u.id, content: out });
    }
    messages.push({ role: "user", content: results });
  }
  return { text, usedTools };
}

/** Single forced structured call (used for food estimation). */
export async function extract(system: string, user: string, tool: ToolDef): Promise<Record<string, unknown>> {
  let result: Record<string, unknown> = {};
  await runChat({
    system: system + `\nSonucu mutlaka ${tool.name} aracını çağırarak ver.`,
    history: [{ role: "user", content: user }],
    tools: [tool],
    maxTurns: 1,
    exec: async (c) => {
      result = c.input;
      return "ok";
    },
  });
  return result;
}

/* ---------------- vision (photo of a plate) ---------------- */

const VISION_PREF: Record<string, string[]> = {
  groq: ["meta-llama/llama-4-maverick-17b-128e-instruct", "meta-llama/llama-4-scout-17b-16e-instruct"],
  gemini: ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
};
const visionChosen: Record<string, string> = {};

async function pickVisionModel(p: Provider): Promise<string | null> {
  const override = p.name === "groq" ? process.env.GROQ_VISION_MODEL : process.env.GEMINI_MODEL;
  if (override) return override;
  if (visionChosen[p.name]) return visionChosen[p.name];
  try {
    const r = await fetch(`${p.base}/models`, { headers: { Authorization: `Bearer ${p.key}` } });
    if (r.ok) {
      const ids = (((await r.json()) as { data?: { id: string }[] }).data ?? []).map((m) => m.id.replace(/^models\//, ""));
      const hit = VISION_PREF[p.name].find((m) => ids.includes(m)) ?? ids.find((m) => (p.name === "groq" ? /llama-4|vision|scout|maverick|-vl/i.test(m) : /flash/.test(m) && !/image|tts|audio|live|embed/.test(m)));
      if (hit) return (visionChosen[p.name] = hit);
    }
  } catch {
    /* ignore */
  }
  return VISION_PREF[p.name][0] ?? null;
}

function jsonFromText(t: string): Record<string, unknown> {
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return {};
  try {
    return JSON.parse(m[0]);
  } catch {
    return {};
  }
}

/** Structured extraction from an image (data URL) + optional text. */
export async function extractVision(system: string, text: string, imageDataUrl: string, tool: ToolDef): Promise<Record<string, unknown>> {
  const p = provider();
  if (p) {
    const model = await pickVisionModel(p);
    if (!model) throw new Error("Görsel tanıyan model bulunamadı");
    const userContent = [{ type: "text", text: text || "Bu tabakta ne var? Yemekleri ve porsiyonları çıkar." }, { type: "image_url", image_url: { url: imageDataUrl } }];
    const call = (withTools: boolean) =>
      fetch(`${p.base}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 900,
          ...(withTools
            ? { tools: [{ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.input_schema } }], tool_choice: { type: "function", function: { name: tool.name } } }
            : {}),
          messages: [
            {
              role: "system",
              content: withTools
                ? system + `\nSonucu ${tool.name} aracıyla ver.`
                : system + `\nYalnızca şu şemaya uyan tek bir JSON nesnesi döndür, başka metin yazma: ${JSON.stringify(tool.input_schema)}`,
            },
            { role: "user", content: userContent },
          ],
        }),
      });
    // Some vision models reject forced tool calls; fall back to plain JSON output.
    let r = await call(true);
    if (!r.ok && r.status !== 429) {
      console.error("vision tools", r.status, (await r.text()).slice(0, 300));
      r = await call(false);
    }
    if (!r.ok) {
      const body = await r.text();
      console.error("vision", model, r.status, body.slice(0, 300));
      delete visionChosen[p.name];
      if (r.status === 429) throw new Error("Ücretsiz kota şu an dolu, birkaç dakika sonra tekrar dene.");
      throw new Error(`${p.name} ${r.status}: ${body.slice(0, 160)}`);
    }
    const j = (await r.json()) as { choices: { message: { content: string | null; tool_calls?: { function: { arguments: string } }[] } }[] };
    const msg = j.choices[0]?.message;
    const args = msg?.tool_calls?.[0]?.function.arguments;
    if (args) {
      try {
        return JSON.parse(args);
      } catch {
        /* fall through to text */
      }
    }
    return jsonFromText(msg?.content ?? "");
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const m = imageDataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
    if (!m) throw new Error("Geçersiz görsel");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 900,
      system,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [tool as any],
      tool_choice: { type: "tool", name: tool.name },
      messages: [
        {
          role: "user",
          content: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { type: "image", source: { type: "base64", media_type: m[1] as any, data: m[2] } },
            { type: "text", text: text || "Bu tabakta ne var?" },
          ],
        },
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.content.find((c: any) => c.type === "tool_use")?.input as Record<string, unknown>) ?? {};
  }
  throw new Error("AI anahtarı tanımlı değil");
}
