"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";

type Message = { author: "user" | "bot"; text: string };

export default function ChatbotPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  // redirect if not logged in
  useEffect(() => {
    console.log("Auth state:", { user, loading });
    if (!loading && !user) {
      console.log("Redirecting to login");
      router.push("/auth/login");
    } else if (!loading && user) {
      console.log("User is logged in:", user);
    }
  }, [user, loading, router]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages((m) => [...m, { author: "user", text }]);
    setInput("");

    try {
      console.log("Sending message:", text);
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId }),
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      setConversationId(data.conversationId);
      setMessages((m) => [...m, { author: "bot", text: data.reply }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((m) => [...m, { author: "bot", text: "Sorry, I couldn't process your message. Please try again." }]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center p-4">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-lg flex flex-col">
        {/* Debug info */}
        <div className="p-2 bg-yellow-100 text-xs text-yellow-800 border-b">
          Debug: User: {user ? user.email : 'Not logged in'}, Loading: {loading ? 'Yes' : 'No'}
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-96">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.author === "bot" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`px-4 py-2 rounded-lg ${
                  msg.author === "bot"
                    ? "bg-gray-200 text-gray-800"
                    : "bg-indigo-500 text-white"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border rounded-l px-3 py-2"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-indigo-600 text-white px-4 py-2"
          >
            Send
          </button>
          {/* <button
            onClick={async () => {
              try {
                const res = await fetch("/api/chatbot", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ message: "test" }),
                });
                const data = await res.json();
                alert(`API Response: ${JSON.stringify(data)}`);
              } catch (error) {
                alert(`API Error: ${error}`);
              }
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-r ml-2"
          >
            Test API
          </button> */}
        </div>
      </div>
    </div>
  );
}
