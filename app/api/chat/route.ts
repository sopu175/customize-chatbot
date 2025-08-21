// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  generateChatbotResponse,
  createStreamingResponse,
} from "@/lib/chatbot";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, stream } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 },
      );
    }

    console.log("Processing request:", {
      message: message.slice(0, 50) + "...",
      stream,
    });

    // If streaming is requested, return streaming response
    if (stream) {
      console.log("Starting streaming response");

      const streamingResponse = await createStreamingResponse(message);

      return new Response(streamingResponse, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no", // Disable nginx buffering
        },
      });
    }

    // Otherwise, return regular JSON response
    console.log("Starting regular response");
    const startTime = Date.now();

    const response = await generateChatbotResponse(message);

    const endTime = Date.now();
    console.log(`Regular response completed in ${endTime - startTime}ms`);

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
      processingTime: endTime - startTime,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
