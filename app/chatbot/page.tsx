"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type DraftEvent = Partial<{
  name: string;
  date: string;
  location: string;
  description: string;
}>;

type ChatStage = "collecting" | "confirmation" | "done";

type ChatResponse = {
  conversationId: string;
  reply: string;
  draft: DraftEvent;
  stage: ChatStage;
  history: Message[];
};

type ErrorResponse = {
  message?: string;
};

const INITIAL_ASSISTANT_MESSAGE =
  "Tell me about the event you want to create. You can give me everything at once, or we can build it step by step.";

function buildStorageKey(userId: string) {
  return `eventhub-chatbot-session:${userId}`;
}

export default function ChatbotPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_ASSISTANT_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEvent>({});
  const [stage, setStage] = useState<ChatStage>("collecting");
  const [sending, setSending] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;

    try {
      const saved = localStorage.getItem(buildStorageKey(user.id));
      if (!saved) {
        setRestored(true);
        return;
      }

      const parsed = JSON.parse(saved) as {
        conversationId?: string;
        messages?: Message[];
        draft?: DraftEvent;
        stage?: ChatStage;
      };

      if (parsed.conversationId) {
        setConversationId(parsed.conversationId);
      }

      if (parsed.messages?.length) {
        setMessages(parsed.messages);
      }

      if (parsed.draft) {
        setDraft(parsed.draft);
      }

      if (
        parsed.stage === "collecting" ||
        parsed.stage === "confirmation" ||
        parsed.stage === "done"
      ) {
        setStage(parsed.stage);
      }
    } catch (error) {
      console.error("Failed to restore chatbot session", error);
    } finally {
      setRestored(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !restored) return;

    localStorage.setItem(
      buildStorageKey(user.id),
      JSON.stringify({
        conversationId,
        messages,
        draft,
        stage,
      })
    );
  }, [conversationId, draft, messages, restored, stage, user]);

  const visibleDraftFields = useMemo(
    () =>
      [
        { label: "Name", value: draft.name },
        { label: "Date", value: draft.date },
        { label: "Location", value: draft.location },
        { label: "Description", value: draft.description },
      ].filter((item) => item.value),
    [draft]
  );

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          history: nextMessages,
          draft,
          stage,
        }),
      });

      const data = (await res.json()) as ChatResponse | ErrorResponse;

      if (!res.ok || !("conversationId" in data)) {
        const errorMessage =
          "message" in data && data.message
            ? data.message
            : "Chatbot request failed";

        throw new Error(errorMessage);
      }

      // Now TypeScript knows this is ChatResponse
      setConversationId(data.conversationId);
      setDraft(data.draft ?? {});
      setStage(data.stage);
      setMessages(
        data.history?.length
          ? data.history
          : [...nextMessages, { role: "assistant", content: data.reply }]
      );
    } catch (error) {
      const fallback =
        error instanceof Error
          ? error.message
          : "Sorry, I couldn't process your message. Please try again.";

      setMessages((current) => [
        ...current,
        { role: "assistant", content: fallback },
      ]);
    } finally {
      setSending(false);
    }
  };

  const startNewChat = () => {
    if (user) {
      localStorage.removeItem(buildStorageKey(user.id));
    }
    setConversationId(null);
    setDraft({});
    setStage("collecting");
    setInput("");
    setMessages([{ role: "assistant", content: INITIAL_ASSISTANT_MESSAGE }]);
  };

  if (loading || !restored) {
    return (
      <div className="loading-state">
        <div className="loading-card">Opening your planning assistant...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="page-shell">
      <div className="page-container space-y-6">
        <div className="chat-shell lg:grid lg:grid-cols-[1.6fr_0.8fr]">
          <div className="flex min-h-[78vh] flex-col border-b border-white/70 lg:border-b-0 lg:border-r">
            <div className="chat-header">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="eyebrow">AI Event Planner</span>
                  <h1 className="section-heading mt-4 text-3xl">
                    Chatbot Planner
                  </h1>
                  <p className="section-copy mt-1">
                    I keep the running draft and the conversation history, so
                    you can refine details naturally instead of repeating them.
                  </p>
                </div>
                <button onClick={startNewChat} className="button-ghost">
                  New Chat
                </button>
              </div>
            </div>

            <div className="chat-scroll">
              {messages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}-${msg.content.slice(0, 24)}`}
                  className={
                    msg.role === "assistant"
                      ? "chat-row-bot"
                      : "chat-row-user"
                  }
                >
                  <div
                    className={
                      msg.role === "assistant"
                        ? "chat-bubble-bot"
                        : "chat-bubble-user"
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="chat-row-bot">
                  <div className="chat-bubble-bot">
                    Updating your event draft...
                  </div>
                </div>
              )}
            </div>

            <div className="chat-composer">
              <div className="chat-form">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="chat-input"
                  placeholder="Example: Create a design meetup in Bengaluru on 2026-05-12"
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  className="button-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="panel p-5">
              <span className="eyebrow">Session</span>
              <p className="mt-4 text-sm font-semibold text-slate-900">
                Stage: {stage}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {conversationId
                  ? "Your current session is being reused across messages and refreshes on this device."
                  : "A new planning session will start with your next message."}
              </p>
            </div>

            <div className="panel p-5">
              <span className="eyebrow">Draft</span>
              {visibleDraftFields.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {visibleDraftFields.map((field) => (
                    <div
                      key={field.label}
                      className="rounded-2xl bg-white/70 px-4 py-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {field.label}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-800">
                        {field.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  No event details captured yet. Start by sharing the event
                  name, date, location, or description.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
