import { NextResponse } from "next/server";
import type { HouseSnapshot } from "../../../lib/modules";

export const dynamic = "force-dynamic";

const ollamaBaseUrl = (
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"
).replace(/\/$/, "");
const ollamaModel = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

type ChatMessage = { role: "user" | "assistant"; text: string };

function ollamaError(error: unknown) {
  if (error instanceof Error && error.name === "AbortError")
    return "Ollama took too long to respond";
  return error instanceof Error ? error.message : "Ollama is unavailable";
}

async function ollamaFetch(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    return await fetch(`${ollamaBaseUrl}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  try {
    const response = await ollamaFetch("/api/tags", { cache: "no-store" });
    if (!response.ok)
      throw new Error(`Ollama returned HTTP ${response.status}`);
    const data = (await response.json()) as {
      models?: Array<{ name?: string }>;
    };
    const installed =
      data.models?.some((model) => model.name === ollamaModel) ?? false;
    if (!installed)
      throw new Error(`${ollamaModel} is not installed in Ollama`);
    return NextResponse.json(
      { online: true, model: ollamaModel },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { online: false, model: ollamaModel, error: ollamaError(error) },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: unknown;
      history?: unknown;
      snapshot?: HouseSnapshot;
    };
    const message =
      typeof body.message === "string"
        ? body.message
            .replace(/[\u0000-\u001f\u007f]/g, " ")
            .trim()
            .slice(0, 2000)
        : "";
    if (!message)
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 },
      );

    const history = Array.isArray(body.history)
      ? body.history
          .filter((item): item is ChatMessage => {
            if (!item || typeof item !== "object") return false;
            const candidate = item as Partial<ChatMessage>;
            return (
              (candidate.role === "user" || candidate.role === "assistant") &&
              typeof candidate.text === "string"
            );
          })
          .slice(-8)
          .map((item) => ({
            role: item.role,
            content: item.text.slice(0, 2000),
          }))
      : [];
    const context = body.snapshot
      ? JSON.stringify(body.snapshot)
      : "House telemetry was not provided.";

    const response = await ollamaFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        messages: [
          {
            role: "system",
            content: [
              "You are LocalHouse, a concise local home-operations assistant.",
              "Answer the user's question using the current telemetry below.",
              "Do not invent readings, events, names, or capabilities. If the telemetry does not contain an answer, say that clearly.",
              "Keep replies to 2-4 short sentences. Mention when a status is based on telemetry rather than direct confirmation.",
              `Current house telemetry: ${context}`,
            ].join("\n\n"),
          },
          ...history,
          { role: "user", content: message },
        ],
        options: { temperature: 0.2, num_predict: 256 },
      }),
    });
    if (!response.ok)
      throw new Error(
        (await response.text()) || `Ollama returned HTTP ${response.status}`,
      );

    const data = (await response.json()) as { message?: { content?: unknown } };
    const answer =
      typeof data.message?.content === "string"
        ? data.message.content.trim()
        : "";
    if (!answer) throw new Error("Ollama returned an empty response");
    return NextResponse.json(
      { answer, model: ollamaModel },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: ollamaError(error) },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
