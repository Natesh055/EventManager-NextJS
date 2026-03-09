import { NextRequest, NextResponse } from "next/server";
import { handleChat } from "@/lib/chatbotService";

export async function POST(req: NextRequest) {
  try {
    const { message, conversationId } = await req.json();
    const result = await handleChat(message, conversationId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("chatbot route error", err);
    return NextResponse.json(
      { message: "Chatbot failure" },
      { status: 500 }
    );
  }
}
