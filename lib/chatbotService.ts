import { v4 as uuidv4 } from "uuid";
import {
  ChatIntent,
  ChatMessagePayload,
  ExtractedEventFields,
  sendToMCP,
} from "./mcpClient";
import { createEvent, DraftEvent } from "./eventService";

export interface ChatContextSnapshot {
  conversationId?: string;
  draft?: Partial<DraftEvent>;
  stage?: ChatStage;
  history?: ChatMessagePayload[];
}

export interface HandleChatRequest extends ChatContextSnapshot {
  message: string;
}

export interface HandleChatResponse {
  conversationId: string;
  reply: string;
  draft: Partial<DraftEvent>;
  stage: ChatStage;
  history: ChatMessagePayload[];
}

type ChatStage = "collecting" | "confirmation" | "done";

interface ChatContext {
  id: string;
  draft: Partial<DraftEvent>;
  stage: ChatStage;
  history: ChatMessagePayload[];
}

const contexts = new Map<string, ChatContext>();

const REQUIRED_FIELDS: (keyof DraftEvent)[] = [
  "name",
  "date",
  "location",
  "description",
];

const QUESTIONS: Record<keyof DraftEvent, string> = {
  name: "What should I call the event?",
  date: "What date should I use? Please send it in YYYY-MM-DD format, and make sure it is in the future.",
  location: "Where will the event take place?",
  description: "What short description should appear on the event page?",
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidFutureDate(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed > new Date();
}

function hasValidFieldValue(
  field: keyof DraftEvent,
  value: DraftEvent[keyof DraftEvent] | undefined
): boolean {
  if (!isNonEmptyString(value)) return false;
  return field !== "date" || isValidFutureDate(value);
}

function firstMissing(ctx: ChatContext): keyof DraftEvent | null {
  return REQUIRED_FIELDS.find((field) => !hasValidFieldValue(field, ctx.draft[field])) ?? null;
}

function applyExtractedDraftValues(
  draft: Partial<DraftEvent>,
  extracted?: ExtractedEventFields
) {
  if (!extracted) return;

  if (isNonEmptyString(extracted.name)) draft.name = extracted.name.trim();
  if (isNonEmptyString(extracted.date)) draft.date = extracted.date.trim();
  if (isNonEmptyString(extracted.location)) {
    draft.location = extracted.location.trim();
  }
  if (isNonEmptyString(extracted.description)) {
    draft.description = extracted.description.trim();
  }
}

function trimHistory(history: ChatMessagePayload[]): ChatMessagePayload[] {
  return history.slice(-20);
}

function appendUserMessage(
  history: ChatMessagePayload[],
  message: string
): ChatMessagePayload[] {
  const lastEntry = history[history.length - 1];
  if (lastEntry?.role === "user" && lastEntry.content === message) {
    return trimHistory(history);
  }

  return trimHistory([...history, { role: "user", content: message }]);
}

function buildDraftSummary(draft: Partial<DraftEvent>): string {
  return [
    "Here is the event draft I have:",
    `- Name: ${draft.name ?? "Not set"}`,
    `- Date: ${draft.date ?? "Not set"}`,
    `- Location: ${draft.location ?? "Not set"}`,
    `- Description: ${draft.description ?? "Not set"}`,
  ].join("\n");
}

function buildCollectingReply(
  ctx: ChatContext,
  intent: ChatIntent,
  modelReply: string
): string {
  const missing = firstMissing(ctx);
  if (!missing) {
    return `${buildDraftSummary(ctx.draft)}\n\nIs everything correct? Reply with yes to create it, or send the detail you want to change.`;
  }

  if (intent === "revise") {
    return `${buildDraftSummary(ctx.draft)}\n\nUpdated. ${QUESTIONS[missing]}`;
  }

  if (
    modelReply &&
    !/^(what|where|when|please provide|please share)/i.test(modelReply.trim())
  ) {
    return `${modelReply}\n\n${QUESTIONS[missing]}`;
  }

  return QUESTIONS[missing];
}

function createFreshContext(conversationId?: string): ChatContext {
  const id = conversationId || uuidv4();
  return {
    id,
    draft: {},
    stage: "collecting",
    history: [],
  };
}

function hydrateContext(request: ChatContextSnapshot): ChatContext {
  const conversationId = request.conversationId;
  const cached = conversationId ? contexts.get(conversationId) : undefined;
  const ctx = cached
    ? {
        ...cached,
        draft: { ...cached.draft },
        history: [...cached.history],
      }
    : createFreshContext(conversationId);

  if (request.draft) {
    ctx.draft = { ...ctx.draft, ...request.draft };
  }

  if (request.stage) {
    ctx.stage = request.stage;
  }

  if (request.history?.length) {
    ctx.history = trimHistory(
      request.history.filter(
        (entry) =>
          (entry.role === "user" || entry.role === "assistant") &&
          isNonEmptyString(entry.content)
      )
    );
  }

  contexts.set(ctx.id, ctx);
  return ctx;
}

export async function handleChat(
  request: HandleChatRequest
): Promise<HandleChatResponse> {
  const ctx = hydrateContext(request);
  const userMessage = request.message.trim();

  if (!userMessage) {
    return {
      conversationId: ctx.id,
      reply: "Send me a few details about the event you want to create.",
      draft: ctx.draft,
      stage: ctx.stage,
      history: ctx.history,
    };
  }

  ctx.history = appendUserMessage(ctx.history, userMessage);

  const mcpResp = await sendToMCP(userMessage, {
    draft: ctx.draft,
    stage: ctx.stage,
    history: ctx.history,
  });

  if (mcpResp.intent === "restart") {
    ctx.draft = {};
    ctx.stage = "collecting";
    const reply = "Starting fresh. What should I call the event?";
    ctx.history = trimHistory([...ctx.history, { role: "assistant", content: reply }]);
    contexts.set(ctx.id, ctx);
    return {
      conversationId: ctx.id,
      reply,
      draft: ctx.draft,
      stage: ctx.stage,
      history: ctx.history,
    };
  }

  applyExtractedDraftValues(ctx.draft, mcpResp.extracted);

  let reply: string;

  if (ctx.stage === "collecting") {
    const missing = firstMissing(ctx);
    if (!missing) {
      ctx.stage = "confirmation";
      reply = `${buildDraftSummary(
        ctx.draft
      )}\n\nIs everything correct? Reply with yes to create it, or send the detail you want to change.`;
    } else {
      reply = buildCollectingReply(ctx, mcpResp.intent, mcpResp.reply);
    }
  } else if (ctx.stage === "confirmation") {
    const missing = firstMissing(ctx);

    if (mcpResp.intent === "confirm") {
      if (missing) {
        ctx.stage = "collecting";
        reply = `I still need one more detail before I can create it. ${QUESTIONS[missing]}`;
      } else {
        try {
          await createEvent(ctx.draft as DraftEvent);
          ctx.stage = "done";
          reply =
            "Your event has been created successfully. If you want, I can help you draft another one.";
        } catch (error) {
          console.error("create event from chatbot failed", error);
          reply =
            "I couldn't create the event just yet. Please review the details and try again.";
        }
      }
    } else {
      if (missing) {
        ctx.stage = "collecting";
        reply = `I updated the draft. ${QUESTIONS[missing]}`;
      } else {
        reply = `${buildDraftSummary(
          ctx.draft
        )}\n\nI updated the draft. Reply with yes when you want me to create it, or tell me what to change next.`;
      }
    }
  } else {
    if (mcpResp.intent === "provide_details" || mcpResp.intent === "revise") {
      ctx.stage = "confirmation";
      reply = `${buildDraftSummary(
        ctx.draft
      )}\n\nThis is your latest draft. Reply with yes to create it, or send any change you want.`;
    } else {
      reply =
        "Your last event draft is complete. Tell me if you want to start a new one or change the existing details.";
    }
  }

  ctx.history = trimHistory([...ctx.history, { role: "assistant", content: reply }]);
  contexts.set(ctx.id, ctx);

  return {
    conversationId: ctx.id,
    reply,
    draft: ctx.draft,
    stage: ctx.stage,
    history: ctx.history,
  };
}
