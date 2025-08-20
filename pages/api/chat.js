import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { loadIndex } from "../../lib/indexer.js";
import pRetry from 'p-retry';
import '../../styles/globals.css';


const provider = process.env.LLM_PROVIDER || "ollama";
const model = provider === "openai" ? new ChatOpenAI({ modelName: "gpt-4" }) : new ChatOllama({ model: "mistral" });

let cachedVectorStore = null;

async function createVectorStoreWithRetry() {
  return pRetry(
    async () => {
      console.log("Loading vector store...");
      const store = await loadIndex();
      console.log("Vector store loaded successfully");
      return store;
    },
    {
      retries: 3,
      onFailedAttempt: error => {
        console.warn(`Vector store creation attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      },
    }
  );
}

export default async function handler(req, res) {
   if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
   }

   try {
      const { question } = req.body;
      console.log("Received question:", question);

      if (!question || !question.trim()) {
         return res.status(400).json({ error: "Question is required" });
      }

      // Create or use cached vector store
      if (!cachedVectorStore) {
        cachedVectorStore = await createVectorStoreWithRetry();
      }

      // Search for relevant content with reduced results for faster processing
      console.log("Searching for relevant content...");
      const results = await cachedVectorStore.similaritySearch(question.trim(), 2);
      console.log("Search results:", results.length, "items found");

      if (!results || results.length === 0) {
         console.log("No search results found");
         return res.json({
            answer: "I couldn't find specific information about that in our database. Please try asking about Dcastalia's services, case studies, or company information.",
         });
      }

      // Prepare context from search results with length limit
      const context = results
         .map((r) => {
            const content = r.pageContent || r.content || "";
            const url = r.metadata?.url || r.url || "";
            const limitedContent = content.length > 400 ? content.substring(0, 400) + "..." : content;
            return `${url}\n${limitedContent}`;
         })
         .join("\n\n");

      console.log("Context length:", context.length, "characters");

      // Create a more focused and concise prompt
      const systemPrompt = `You are a helpful AI assistant for Dcastalia, a software development company in Bangladesh. 
Answer questions based ONLY on the provided context from dcastalia.com. 
Keep your answers concise (2-3 sentences maximum) and informative.
If the context doesn't contain enough information, say so politely.`;

      const userPrompt = `Question: ${question.trim()}\n\nContext:\n${context}`;

      // Get response from the model with timeout
      console.log("Calling AI model...");
      const response = await Promise.race([
         model.call([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
         ]),
         new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 15000)),
      ]);

      console.log("AI response received:", response.content ? "Yes" : "No");
      console.log("Response length:", response.content ? response.content.length : 0);

      if (!response.content) {
         throw new Error("No content received from AI model");
      }

      res.json({ answer: response.content });
   } catch (error) {
      console.error("Chat API Error:", error);
      console.error("Error stack:", error.stack);

      // Handle specific error types
      if (error.message && error.message.includes("input length exceeds maximum context length")) {
         return res.status(500).json({
            error: "The content is too long to process. Please try a more specific question about Dcastalia.",
         });
      }

      if (error.message && error.message.includes("Failed to fetch")) {
         return res.status(500).json({
            error: "Unable to connect to the AI service. Please check your configuration and try again.",
         });
      }

      if (error.message && error.message.includes("Request timeout")) {
         return res.status(500).json({
            error: "Request timed out. Please try again with a simpler question.",
         });
      }

      res.status(500).json({
         error: "An error occurred while processing your request. Please try again.",
      });
   }
}
