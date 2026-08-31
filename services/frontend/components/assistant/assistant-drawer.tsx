"use client";

import { useState, useRef, useEffect } from "react";
import { useAssistantStore } from "@/lib/store/assistant-store";
import { X, Send, Bot, Waves, TrendingDown, Gauge, Maximize2, Minimize2, Sparkles } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { FollowUpChips } from "./follow-up-chips";
import type { ChatMessage } from "@/lib/agent/types";

const SUGGESTED_PROMPTS = [
  { icon: Waves, label: "Which unit is fouling fastest?" },
  { icon: Gauge, label: "Clean now or wait on B03?" },
  { icon: TrendingDown, label: "What's driving this week's energy cost?" },
];

export function AssistantDrawer() {
  const { isOpen, close, messages, sendMessage, isThinking } = useAssistantStore();
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    sendMessage(input);
    setInput("");
  };

  const handleFollowUpSelect = (prompt: string) => {
    if (isThinking) return;
    sendMessage(prompt);
  };

  return (
    <div
      className={`
        fixed top-0 right-0 z-[60] h-[100dvh] border-l border-border/80
        bg-background/95 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out shadow-2xl
        ${isExpanded ? "w-full md:w-[720px]" : "w-full md:w-[440px]"}
        ${isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"}
      `}
    >
      {/* Top Header */}
      <div className="flex-none h-16 border-b border-border/60 flex items-center justify-between px-5 bg-card/40 relative">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-semibold text-sm text-foreground">RO Plant Assistant</h2>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Self-Reflective
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              Advise-only • 100% Grounded
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors"
            title={isExpanded ? "Collapse width" : "Expand canvas"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={close}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-border/50"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1 max-w-[280px]">
              <h3 className="text-sm font-semibold text-foreground">
                Ask your RO Twin Assistant
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Multi-agent diagnostics across data, physics, economics, and operating manuals.
              </p>
            </div>

            <div className="w-full space-y-2 pt-2">
              {SUGGESTED_PROMPTS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(label)}
                  disabled={isThinking}
                  className="w-full flex items-center gap-3 text-left px-3.5 py-2.5 rounded-xl border border-border/60 bg-card/50 hover:bg-muted/80 transition-all text-xs font-medium text-foreground hover:border-primary/40 disabled:opacity-50"
                >
                  <span className="flex-none flex items-center justify-center w-7 h-7 rounded-lg bg-secondary text-primary">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m: any, i: number) => {
            const chatMsg: ChatMessage = {
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date().toISOString(),
              status: m.isStreaming ? 'streaming' : 'completed',
              thinking: m.thinking,
              artifacts: m.artifacts,
              suggestedFollowUps: m.suggestedFollowUps,
              feedback: m.feedback,
            };
            return (
              <div key={m.id || i} className="space-y-2">
                <MessageBubble message={chatMsg} />
                {chatMsg.suggestedFollowUps && (
                  <FollowUpChips
                    suggestions={chatMsg.suggestedFollowUps}
                    onSelect={handleFollowUpSelect}
                    disabled={isThinking}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input Form Footer */}
      <div className="flex-none p-4 border-t border-border/60 bg-card/30">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isThinking ? "Consulting plant specialists..." : "Ask about units, cleaning, or economics..."}
            disabled={isThinking}
            className="w-full bg-background border border-border/80 focus:border-primary rounded-xl pl-4 pr-12 py-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="absolute right-2 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:hover:bg-primary"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
