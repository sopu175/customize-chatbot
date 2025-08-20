import { useState, useRef, useEffect } from "react";

export default function Home() {
   const [messages, setMessages] = useState([]);
   const [inputValue, setInputValue] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const messagesEndRef = useRef(null);

   const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   };

   useEffect(() => {
      scrollToBottom();
   }, [messages]);

   const sendMessage = async () => {
      if (!inputValue.trim() || isLoading) return;

      const userMessage = {
         id: Date.now(),
         type: "user",
         content: inputValue.trim(),
         timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsLoading(true);

      try {
         const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: inputValue.trim() }),
         });

         const data = await res.json();

         if (!res.ok) {
            const errorMessage = {
               id: Date.now() + 1,
               type: "error",
               content: data.error || "An error occurred. Please try again.",
               timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages((prev) => [...prev, errorMessage]);
            return;
         }

         if (!data.answer) {
            const errorMessage = {
               id: Date.now() + 1,
               type: "error",
               content: "No answer received. Please try again.",
               timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages((prev) => [...prev, errorMessage]);
            return;
         }

         const botMessage = {
            id: Date.now() + 1,
            type: "bot",
            content: data.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
         };

         setMessages((prev) => [...prev, botMessage]);
      } catch (error) {
         console.error("Chat error:", error);
         const errorMessage = {
            id: Date.now() + 1,
            type: "error",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
         };
         setMessages((prev) => [...prev, errorMessage]);
      } finally {
         setIsLoading(false);
      }
   };

   const handleKeyPress = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
         e.preventDefault();
         sendMessage();
      }
   };

   const clearChat = () => {
      setMessages([]);
   };

   const suggestedQuestions = [
      "What services does Dcastalia offer?",
      "Tell me about Dcastalia's case studies",
      "What is Dcastalia's experience in software development?",
      "How can I contact Dcastalia?",
      "What technologies does Dcastalia use?",
   ];

   return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
         {/* Header */}
         <header className="glass border-b border-slate-200/60 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="flex items-center justify-between h-16">
                  <div className="flex items-center space-x-4">
                     <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg hover-lift">
                        <span className="text-white text-xl font-bold">DC</span>
                     </div>
                     <div>
                        <h1 className="text-xl font-bold text-slate-900">Dcastalia AI Assistant</h1>
                        <p className="text-sm text-slate-600">Powered by advanced AI technology</p>
                     </div>
                  </div>
                  <div className="flex items-center space-x-3">
                     <button
                        onClick={clearChat}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200 flex items-center space-x-2 hover-lift focus-ring"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                           />
                        </svg>
                        <span>Clear Chat</span>
                     </button>
                  </div>
               </div>
            </div>
         </header>

         {/* Main Chat Container */}
         <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
               {/* Sidebar */}
               <div className="hidden lg:block lg:col-span-1">
                  <div className="glass rounded-2xl p-6 h-full hover-lift">
                     <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Questions</h3>
                     <div className="space-y-3">
                        {suggestedQuestions.map((question, index) => (
                           <button
                              key={index}
                              onClick={() => setInputValue(question)}
                              className="w-full text-left p-3 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-200 hover-lift focus-ring"
                           >
                              {question}
                           </button>
                        ))}
                     </div>

                     <div className="mt-8 pt-6 border-t border-slate-200">
                        <h4 className="text-sm font-medium text-slate-900 mb-3">About Dcastalia</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                           Dcastalia is a leading software development company in Bangladesh, specializing in custom
                           software, web development, and digital solutions since 2009.
                        </p>
                     </div>
                  </div>
               </div>

               {/* Chat Area */}
               <div className="lg:col-span-3">
                  <div className="glass rounded-2xl h-full flex flex-col hover-lift">
                     {/* Messages */}
                     <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {messages.length === 0 ? (
                           <div className="text-center py-16 mobile-optimized">
                              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl hover-lift">
                                 <svg  height={40}
                                    className="w-10 h-10 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                 >
                                    <path
                                       strokeLinecap="round"
                                       strokeLinejoin="round"
                                       strokeWidth={2}
                                       d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                 </svg>
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900 mb-3">Welcome to Dcastalia AI</h3>
                              <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                                 I'm your AI assistant, ready to help you learn about Dcastalia's services, case
                                 studies, and expertise. Ask me anything!
                              </p>

                              {/* Mobile Quick Questions */}
                              <div className="lg:hidden mt-8">
                                 <h4 className="text-sm font-medium text-slate-900 mb-3">Try asking:</h4>
                                 <div className="grid grid-cols-1 gap-2">
                                    {suggestedQuestions.slice(0, 3).map((question, index) => (
                                       <button
                                          key={index}
                                          onClick={() => setInputValue(question)}
                                          className="p-3 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all duration-200 border border-slate-200/60 hover-lift focus-ring"
                                       >
                                          {question}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        ) : (
                           messages.map((message) => (
                              <div
                                 key={message.id}
                                 className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                              >
                                 <div
                                    className={`max-w-3xl px-6 py-4 rounded-2xl shadow-sm hover-lift ${
                                       message.type === "user"
                                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white message-user"
                                          : message.type === "error"
                                          ? "bg-red-50 text-red-800 border border-red-200 message-bot"
                                          : "bg-white text-slate-800 border border-slate-200/60 message-bot"
                                    }`}
                                 >
                                    <div className="flex items-start space-x-3">
                                       {message.type === "bot" && (
                                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                             <svg
                                                className="w-4 h-4 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                             >
                                                <path
                                                   strokeLinecap="round"
                                                   strokeLinejoin="round"
                                                   strokeWidth={2}
                                                   d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                                />
                                             </svg>
                                          </div>
                                       )}
                                       <div className="flex-1">
                                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                             {message.content}
                                          </p>
                                          <p
                                             className={`text-xs mt-3 ${
                                                message.type === "user" ? "text-blue-100" : "text-slate-400"
                                             }`}
                                          >
                                             {message.timestamp}
                                          </p>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           ))
                        )}

                        {/* Loading Indicator */}
                        {isLoading && (
                           <div className="flex justify-start">
                              <div className="glass px-6 py-4 rounded-2xl shadow-sm">
                                 <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                       <svg
                                          className="w-4 h-4 text-white"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                       >
                                          <path
                                             strokeLinecap="round"
                                             strokeLinejoin="round"
                                             strokeWidth={2}
                                             d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                          />
                                       </svg>
                                    </div>
                                    <div className="flex space-x-1">
                                       <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot"></div>
                                       <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot"></div>
                                       <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot"></div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        )}

                        <div ref={messagesEndRef} />
                     </div>

                     {/* Input Area */}
                     <div className="border-t border-slate-200/60 p-6">
                        <div className="flex space-x-4">
                           <div className="flex-1 relative">
                              <textarea
                                 value={inputValue}
                                 onChange={(e) => setInputValue(e.target.value)}
                                 onKeyPress={handleKeyPress}
                                 placeholder="Ask me anything about Dcastalia..."
                                 className="w-full px-4 py-4 border border-slate-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm focus-ring"
                                 rows="1"
                                 style={{ minHeight: "56px", maxHeight: "120px" }}
                                 disabled={isLoading}
                              />
                              <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                                 {inputValue.length}/1000
                              </div>
                           </div>
                           <button
                              onClick={sendMessage}
                              disabled={!inputValue.trim() || isLoading}
                              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl hover-lift focus-ring"
                           >
                              {isLoading ? (
                                 <>
                                    <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                                       <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                       ></circle>
                                       <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                       ></path>
                                    </svg>
                                    <span>Processing...</span>
                                 </>
                              ) : (
                                 <>
                                    <span>Send</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                       />
                                    </svg>
                                 </>
                              )}
                           </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 text-center">
                           Press Enter to send, Shift+Enter for new line
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </main>
      </div>
   );
}
