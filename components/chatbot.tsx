"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
}

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now() + "-user",
      text: input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Create bot message placeholder for streaming
    const botMessageId = Date.now() + "-bot";
    const botMessage: Message = {
      id: botMessageId,
      text: "",
      isUser: false,
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, botMessage]);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      console.log("Starting streaming request:", userMessage.text);

      // Start with streaming approach
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage.text, stream: true }),
        signal: abortControllerRef.current.signal,
      });

      console.log("API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get("content-type");

      // Check if it's a streaming response
      if (contentType && contentType.includes("text/plain")) {
        // Handle streaming response
        if (!response.body) {
          throw new Error("No response body for streaming");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log("Stream completed");
              break;
            }

            const chunk = decoder.decode(value, { stream: true });

            // Handle different chunk formats - some LLMs send raw text, others send JSON
            if (chunk.trim()) {
              try {
                // Try to parse as JSON first (for structured streaming)
                const parsed = JSON.parse(chunk);
                if (parsed.token) {
                  accumulatedText += parsed.token;
                } else if (parsed.content) {
                  accumulatedText += parsed.content;
                } else if (parsed.text) {
                  accumulatedText += parsed.text;
                }
              } catch {
                // If JSON parsing fails, treat as raw text
                accumulatedText += chunk;
              }

              // Update the streaming message in real-time
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMessageId
                    ? { ...msg, text: accumulatedText }
                    : msg,
                ),
              );
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, isStreaming: false } : msg,
          ),
        );
      } else if (contentType && contentType.includes("application/json")) {
        // Handle regular JSON response (fallback)
        const data = await response.json();
        console.log("Parsed API response:", data);

        if (data.response) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, text: data.response, isStreaming: false }
                : msg,
            ),
          );
        } else {
          throw new Error(
            data.error || data.details || "Failed to get response from server",
          );
        }
      } else {
        // Handle plain text response
        const textResponse = await response.text();
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? { ...msg, text: textResponse, isStreaming: false }
              : msg,
          ),
        );
      }
    } catch (error) {
      console.error("Error in streaming:", error);

      // Handle errors gracefully
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request was aborted");
        return;
      }

      let errorText =
        "Sorry, I encountered an error processing your message. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          errorText =
            "Unable to connect to the server. Please check your connection and try again.";
        } else if (error.message.includes("JSON")) {
          errorText =
            "Server configuration error. Please check the server logs and try again.";
        } else if (error.message.includes("HTTP")) {
          errorText = `Server error: ${error.message}. Please try again or contact support.`;
        }
      }

      // Update the bot message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? { ...msg, text: errorText, isStreaming: false }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    // Cancel any ongoing streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="flex background-header-chat flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl text-white font-bold flex items-center gap-2">
          <Bot className="h-6 w-6 text-white" />
          Dcastalia Chatbot
          {isLoading && (
            <div className="flex items-center gap-1 ml-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
              <span className="text-sm text-primary/60 font-normal">
                streaming...
              </span>
            </div>
          )}
        </CardTitle>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 chat-panel flex flex-col p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium mb-2">
                  Welcome to Dcastalia Chatbot
                </p>
                <p className="text-sm">
                  Ask me anything about Dcastalia.com content. I have access to
                  the latest information from the website.
                </p>
                <div className="text-xs mt-3 px-4 py-2 bg-primary/10 rounded-lg inline-block">
                  Now with real-time streaming responses
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-in slide-in-from-bottom-5 duration-300",
                  message.isUser ? "justify-end" : "justify-start",
                )}
              >
                {!message.isUser && (
                  <div className="flex-shrink-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                        message.isStreaming
                          ? "bg-primary/20 animate-pulse border-2 border-primary/30"
                          : "bg-primary/10",
                      )}
                    >
                      {message.isStreaming ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-2 break-words transition-all duration-200",
                    message.isUser
                      ? "bg-primary text-primary-foreground ml-12"
                      : "bg-muted text-muted-foreground",
                    message.isStreaming &&
                      "bg-muted/80 shadow-lg ring-1 ring-primary/20",
                  )}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.text}
                    {message.isStreaming && message.text && (
                      <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse opacity-70">
                        |
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-1 opacity-70 flex items-center gap-1",
                      message.isUser
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground/70",
                    )}
                  >
                    <span>{formatTime(message.timestamp)}</span>
                    {message.isStreaming && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span>typing</span>
                          <div className="flex space-x-0.5">
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce delay-75"></div>
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce delay-150"></div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {message.isUser && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t input-feild-meta">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isLoading
                  ? "AI is responding..."
                  : "Ask me anything about Dcastalia..."
              }
              disabled={isLoading}
              className="flex-1"
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="relative"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          {isLoading && (
            <div className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-2">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-75"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-150"></div>
              </div>
              <span>Streaming response in real-time</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
