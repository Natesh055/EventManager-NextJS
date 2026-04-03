import OpenAI from "openai";

export type ChatIntent =
  | "provide_details"
  | "confirm"
  | "revise"
  | "restart"
  | "unknown";

export interface ExtractedEventFields {
  name?: string;
  date?: string;
  location?: string;
  description?: string;
}

export interface ChatMessagePayload {
  role: "user" | "assistant";
  content: string;
}

export interface MCPRequestContext {
  draft: Partial<ExtractedEventFields>;
  stage: "collecting" | "confirmation" | "done";
  history: ChatMessagePayload[];
}

export interface MCPResponse {
  reply: string;
  intent: ChatIntent;
  extracted?: ExtractedEventFields;
}

interface ParsedModelResponse {
  reply?: unknown;
  intent?: unknown;
  extracted?: unknown;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeExtractedFields(value: unknown): ExtractedEventFields | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const extracted: ExtractedEventFields = {};

  for (const key of ["name", "date", "location", "description"] as const) {
    const fieldValue = candidate[key];
    if (typeof fieldValue === "string" && fieldValue.trim()) {
      extracted[key] = fieldValue.trim();
    }
  }

  return Object.keys(extracted).length > 0 ? extracted : undefined;
}

function sanitizeIntent(value: unknown): ChatIntent {
  switch (value) {
    case "provide_details":
    case "confirm":
    case "revise":
    case "restart":
      return value;
    default:
      return "unknown";
  }
}

function tryParseModelResponse(content: string): MCPResponse | null {
  const trimmed = content.trim();
  const withoutFences = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    const parsed = JSON.parse(withoutFences) as ParsedModelResponse;
    return {
      reply:
        typeof parsed.reply === "string" && parsed.reply.trim()
          ? parsed.reply.trim()
          : "Tell me a little more about the event you want to create.",
      intent: sanitizeIntent(parsed.intent),
      extracted: sanitizeExtractedFields(parsed.extracted),
    };
  } catch {
    return null;
  }
}

export async function sendToMCP(
  message: string,
  context: MCPRequestContext
): Promise<MCPResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "You help users create events in a multi-turn conversation.",
            `Today's date is ${getTodayString()}.`,
            "Use the full conversation history and current draft to understand references like 'same place', 'next Friday', or 'change the date'.",
            "Normalize any extracted date into YYYY-MM-DD when possible.",
            "If the user is clearly confirming the prepared event, set intent to 'confirm'.",
            "If the user is correcting or changing details, set intent to 'revise'.",
            "If the user wants to start over, set intent to 'restart'.",
            "If the user is giving event information, set intent to 'provide_details'.",
            "Return JSON only with this exact shape:",
            '{"reply":"string","intent":"provide_details|confirm|revise|restart|unknown","extracted":{"name":"string?","date":"YYYY-MM-DD?","location":"string?","description":"string?"}}',
            `Current draft: ${JSON.stringify(context.draft)}`,
            `Current stage: ${context.stage}`,
            `Conversation history: ${JSON.stringify(context.history)}`,
          ].join("\n"),
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const content =
      completion.choices[0]?.message?.content ??
      '{"reply":"Tell me more about the event you want to create.","intent":"unknown","extracted":{}}';

    const parsed = tryParseModelResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      reply: content,
      intent: "unknown",
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to process chat message");
  }
}
