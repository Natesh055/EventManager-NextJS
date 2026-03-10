import { v4 as uuidv4 } from "uuid";
import { sendToMCP } from "./mcpClient";
import { createEvent, DraftEvent } from "./eventService";

interface ChatContext {
  id: string;
  draft: Partial<DraftEvent>;
  stage: "collecting" | "confirmation" | "done";
}

const contexts = new Map<string, ChatContext>();

const REQUIRED_FIELDS: (keyof DraftEvent)[] = [
  "name",
  "date",
  "location",
  "description",
];

function firstMissing(ctx: ChatContext): keyof DraftEvent | null {
  return (
    REQUIRED_FIELDS.find((f) => !ctx.draft[f]) ?? null
  );
}

export async function handleChat(
  message: string,
  conversationId?: string
): Promise<{ conversationId: string; reply: string }> {
  let ctx: ChatContext;

  if (!conversationId || !contexts.has(conversationId)) {
    const id = uuidv4();
    ctx = { id, draft: {}, stage: "collecting" };
    contexts.set(id, ctx);
  } else {
    ctx = contexts.get(conversationId)!;
  }

  // ask MCP server to parse the incoming text
  const mcpResp = await sendToMCP(message, {
    draft: ctx.draft,
    stage: ctx.stage,
  });

  // merge any extracted values
  if (mcpResp.extracted) {
    Object.assign(ctx.draft, mcpResp.extracted);
  }

  // advance conversation
  if (ctx.stage === "collecting") {
    const missing = firstMissing(ctx);
    if (!missing) {
      // all fields are present, ask for confirmation
      ctx.stage = "confirmation";
      const summary = `Here’s what I have:\n` +
        `• Name: ${ctx.draft.name}\n` +
        `• Date: ${ctx.draft.date}\n` +
        `• Location: ${ctx.draft.location}\n` +
        `• Description: ${ctx.draft.description}\n\n` +
        `Is that correct? (yes / no)`;
      return { conversationId: ctx.id, reply: summary };
    }

    const questions: Record<keyof DraftEvent, string> = {
      name: "What is the event name?",
      date: "On what date is the event?",
      location: "Where will it take place?",
      description: "Please provide a short description.",
    };

    // if MCP suggested a reply, use it; otherwise ask the next missing question
    return {
      conversationId: ctx.id,
      reply: mcpResp.reply || questions[missing],
    };
  } else if (ctx.stage === "confirmation") {
    if (/^(y|yes|correct|sure)/i.test(message)) {
      try {
        await createEvent(ctx.draft as DraftEvent);
        ctx.stage = "done";
        return {
          conversationId: ctx.id,
          reply: "✅ Your event has been created!",
        };
      } catch (err) {
        return {
          conversationId: ctx.id,
          reply: "Oops, I couldn’t create the event. Please try again later.",
        };
      }
    } else {
      // user said no – reset or allow edits
      ctx.draft = {};
      ctx.stage = "collecting";
      return {
        conversationId: ctx.id,
        reply: "Okay, let’s start over. What’s the event name?",
      };
    }
  }

  // fallback
  return {
    conversationId: ctx.id,
    reply: mcpResp.reply || "Tell me more about the event.",
  };
}
