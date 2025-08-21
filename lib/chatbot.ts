import fs from "fs";
import path from "path";
import Fuse from "fuse.js";
import { getLLM, validateLLMConnection } from "./llm";

interface DcastaliaPage {
  url: string;
  title: string;
  description: string;
  content: string;
  scrapedAt: string;
}

interface DcastaliaData {
  lastUpdated: string;
  pages: DcastaliaPage[];
  sitemap: string[];
}

// Cache in memory so we don't reload each query
let cachedData: DcastaliaData | null = null;
let fuse: Fuse<DcastaliaPage> | null = null;

function loadDcastaliaData(): DcastaliaData {
  if (cachedData) return cachedData;

  try {
    const dataPath = path.join(process.cwd(), "app/data/dcastalia.json");
    const raw = fs.readFileSync(dataPath, "utf-8");
    cachedData = JSON.parse(raw);

    // Initialize Fuse index once
    fuse = new Fuse(cachedData.pages, {
      keys: ["title", "description", "content"],
      threshold: 0.3,
      includeScore: true,
    });

    return cachedData;
  } catch (error) {
    console.error("Error loading Dcastalia data:", error);
    cachedData = {
      lastUpdated: new Date().toISOString(),
      pages: [],
      sitemap: [],
    };
    return cachedData;
  }
}

function findRelevantPages(
  query: string,
  data: DcastaliaData,
  limit = 3,
): DcastaliaPage[] {
  if (!fuse || data.pages.length === 0) return [];
  const results = fuse.search(query, { limit });
  return results.map((r) => r.item);
}

/**
 * Enhanced streaming response with real-time token delivery
 */
export async function generateChatbotResponse(
  message: string,
  onToken?: (chunk: string) => void,
): Promise<string> {
  try {
    // Pre-validate connection to fail fast
    await validateLLMConnection();

    const llm = getLLM();
    const data = loadDcastaliaData();

    if (data.pages.length === 0) {
      const errorMsg =
        "I don't have any data from Dcastalia yet. Please ensure the scraper has successfully collected data by running 'npm run scrape'.";

      if (onToken) {
        // Stream error message character by character for consistency
        for (let i = 0; i < errorMsg.length; i++) {
          onToken(errorMsg[i]);
          // Small delay for visual effect
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
      }
      return errorMsg;
    }

    // Optimize context building - reduce content length for faster processing
    const relevantPages = findRelevantPages(message, data);
    let context = "";

    if (relevantPages.length > 0) {
      console.log(
        `Found ${relevantPages.length} relevant pages for query: "${message}"`,
      );
      context = relevantPages
        .map(
          (page) => `**${page.title}**
URL: ${page.url}
${page.description ? `Description: ${page.description}` : ""}
Content: ${page.content.slice(0, 400)}...`,
        ) // Further reduced to 400 chars for speed
        .join("\n---\n");
    } else {
      console.log(`No relevant pages found for query: "${message}"`);
    }

    // Ultra-optimized prompt for speed
    const prompt = `You are a helpful Dcastalia.com chatbot. Answer concisely and accurately.

${
  context
    ? `Context from Dcastalia.com:
${context}

Use this context to answer the user's question.`
    : "No specific context available. Provide helpful guidance about visiting Dcastalia.com."
}

User question: ${message}

Instructions: Be conversational and helpful. Cite URLs when referencing specific content. Keep response under 150 words for speed.`;

    console.log("Starting ultra-fast streaming...");
    const startTime = Date.now();

    // Enhanced streaming with performance optimizations
    const streamOptions = {
      temperature: 0.7,
      maxTokens: 400, // Reduced for faster completion
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
    };

    const stream = await llm.stream(prompt, streamOptions);

    let fullResponse = "";
    let tokenCount = 0;
    let lastStreamTime = Date.now();

    try {
      for await (const chunk of stream) {
        // Extract token with improved efficiency
        let token = "";

        if (typeof chunk === "string") {
          token = chunk;
        } else if (chunk && typeof chunk === "object") {
          // Handle different LLM response formats
          token =
            chunk.content ||
            chunk.text ||
            chunk.delta?.content ||
            chunk.choices?.[0]?.delta?.content ||
            chunk.choices?.[0]?.text ||
            chunk.token ||
            "";
        }

        if (token && token.length > 0) {
          fullResponse += token;
          tokenCount++;

          // Stream immediately - no buffering delays
          if (onToken) {
            onToken(token);
          }

          // Log streaming performance every 50 tokens
          if (tokenCount % 50 === 0) {
            const currentTime = Date.now();
            const timeSinceLastLog = currentTime - lastStreamTime;
            console.log(
              `Streamed ${tokenCount} tokens in ${timeSinceLastLog}ms`,
            );
            lastStreamTime = currentTime;
          }
        }
      }
    } catch (streamError) {
      console.error("Streaming interrupted:", streamError);
      const errorSuffix = "\n\n[Response was interrupted]";
      if (onToken) onToken(errorSuffix);
      fullResponse += errorSuffix;
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const tokensPerSecond =
      tokenCount > 0 ? ((tokenCount / totalTime) * 1000).toFixed(2) : "0";

    console.log(
      `Streaming completed: ${tokenCount} tokens in ${totalTime}ms (${tokensPerSecond} tokens/sec)`,
    );

    return fullResponse.trim();
  } catch (error) {
    console.error("Chatbot error:", error);

    // Stream error messages for better UX
    let errorMessage = "";

    if (error instanceof Error) {
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed")
      ) {
        errorMessage =
          "Connection failed. Please ensure Ollama is running (`ollama serve`) or check your OpenAI configuration.";
      } else if (error.message.includes("API key")) {
        errorMessage =
          "API key issue. Please check your environment variables.";
      } else if (error.message.includes("model")) {
        errorMessage =
          "Model issue. Please ensure the correct model is installed and configured.";
      } else if (error.message.includes("Cannot connect to Ollama")) {
        errorMessage = error.message;
      } else {
        errorMessage = `Error: ${error.message}`;
      }
    } else {
      errorMessage = "Unknown error occurred. Please check server logs.";
    }

    // Stream error message character by character if callback is provided
    if (onToken) {
      for (let i = 0; i < errorMessage.length; i++) {
        onToken(errorMessage[i]);
        await new Promise((resolve) => setTimeout(resolve, 25)); // Slightly slower for error visibility
      }
    }

    return errorMessage;
  }
}

/**
 * Non-streaming version for fallback
 */
export async function generateChatbotResponseSync(
  message: string,
): Promise<string> {
  try {
    await validateLLMConnection();
    const llm = getLLM();
    const data = loadDcastaliaData();

    if (data.pages.length === 0) {
      return "No Dcastalia data available. Run 'npm run scrape' first.";
    }

    const relevantPages = findRelevantPages(message, data, 2);
    const context = relevantPages
      .map((page) => `${page.title}: ${page.content.slice(0, 250)}...`)
      .join("\n");

    const prompt = `Answer briefly about Dcastalia based on: ${context}\n\nUser: ${message}`;

    const response = await llm.invoke(prompt);
    return typeof response === "string"
      ? response
      : response.content || response.text || "";
  } catch (error) {
    console.error("Sync chatbot error:", error);
    return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

/**
 * Streaming handler for API routes - returns a ReadableStream
 */
export async function createStreamingResponse(
    message: string,
): Promise<ReadableStream> {
    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            await generateChatbotResponse(message, (token: string) => {
                try {
                    controller.enqueue(encoder.encode(token));
                } catch (error) {
                    console.error("Error encoding token:", error);
                }
            });

            // ✅ Only close after the generator is fully finished
            controller.close();
        },
        cancel() {
            console.log("Stream was cancelled by client");
        },
    });
}
