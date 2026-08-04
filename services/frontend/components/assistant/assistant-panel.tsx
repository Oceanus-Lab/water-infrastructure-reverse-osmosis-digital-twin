"use client";

import { useState, useRef, useEffect } from "react";
import { useAssistantStore } from "@/lib/store/assistant-store";
import { X, Send, Bot, User, Waves, TrendingDown, Gauge } from "lucide-react";
import { AssistantProposalCard } from "./assistant-proposal-card";
import { SourceTraceBadge } from "./source-trace-badge";
import { EvidenceCard } from "./evidence-card";
import { AssistantMarkdown } from '@/components/assistant/assistant-markdown';

const SUGGESTED_PROMPTS = [
  { icon: Waves, label: "Which unit is fouling fastest?" },
  { icon: Gauge, label: "Clean now or wait on B03?" },
  { icon: TrendingDown, label: "What's driving this week's energy cost?" },
];

export function AssistantPanel() {
  const { isOpen, close, messages, sendMessage, isThinking } = useAssistantStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
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

  return (
    <div
      className={`
        fixed top-0 right-0 z-[60] h-[100dvh] w-full md:w-[400px] border-l border-border
        bg-background flex flex-col transition-transform duration-[800ms] ease-[cubic-bezier(0.32,0.72,0,1)]
        ${isOpen ? "translate-x-0" : "translate-x-full"}
      `}
    >
      {/* Header */}
      <div className="flex-none h-20 border-b border-border flex items-center justify-between px-6 bg-background relative">
        <div className="flex items-center space-x-4 relative z-10">
          <div className="flex items-center justify-center w-10 h-10 rounded-[14px] bg-secondary border border-border text-primary">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-sans text-[15px] tracking-wide font-medium text-foreground">
              RO Assistant
            </h2>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Online</span>
            </div>
          </div>
        </div>
        <button
          onClick={close}
          className="relative z-10 flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors focus:outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-8 space-y-8 bg-background scrollbar-none"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
            <div className="space-y-4 flex flex-col items-center">
              <div className="w-14 h-14 rounded-[20px] bg-secondary flex items-center justify-center border border-border">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-[15px] font-semibold text-foreground tracking-wide">
                  Ask about your plant
                </h3>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed max-w-[260px]">
                  Advise-only diagnostics — every answer cites the reading or
                  model behind it.
                </p>
              </div>
            </div>
            <div className="w-full space-y-2">
              {SUGGESTED_PROMPTS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(label)}
                  disabled={isThinking}
                  className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-[16px] border border-border bg-background hover:bg-secondary disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <span className="flex-none flex items-center justify-center w-8 h-8 rounded-[12px] bg-secondary text-primary">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[13px] font-medium text-foreground">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className={`text-[10px] font-medium uppercase tracking-[0.1em] px-1 mb-1 ${msg.role === 'user' ? 'text-primary' : 'text-muted-foreground'}`}>
                {msg.role === 'user' ? 'Operator' : 'AI'}
              </span>
              <div 
                className={`
                  max-w-[92%] rounded-[20px] px-5 py-4 text-[14px] leading-[1.6] border
                  ${msg.role === 'user' 
                    ? 'bg-secondary border-border text-secondary-foreground rounded-tr-[8px]' 
                    : msg.content.startsWith("I don't know") 
                      ? 'bg-muted border-border text-muted-foreground rounded-tl-[8px] italic'
                      : 'bg-background border-border text-foreground rounded-tl-[8px]'}
                `}
              >
                {/* The model answers in markdown; the operator's own message is literal text. */}
                {msg.role === 'user'
                  ? <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                  : <AssistantMarkdown>{msg.content}</AssistantMarkdown>}
                
                {msg.sourcedFigures && msg.sourcedFigures.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <div className="flex flex-wrap gap-y-2 -mx-1">
                      {msg.sourcedFigures.map((trace, idx) => (
                        <SourceTraceBadge key={idx} trace={trace} />
                      ))}
                    </div>
                    <div className="space-y-2 w-full pt-1">
                      {msg.sourcedFigures.map((trace, idx) => (
                        <EvidenceCard key={`ev-${idx}`} trace={trace} />
                      ))}
                    </div>
                  </div>
                )}
                
                {msg.isStreaming && (
                  <span className="inline-block w-1.5 h-3 ml-1 bg-current animate-pulse align-middle" />
                )}
              </div>
              {msg.proposal && (
                <div className="w-full max-w-[90%]">
                  <AssistantProposalCard messageId={msg.id} proposal={msg.proposal} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="flex-none p-5 border-t border-border bg-background">
        <form onSubmit={handleSubmit} className="relative group p-1 bg-background rounded-[20px] border border-border focus-within:ring-1 focus-within:ring-ring transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Query plant operations..."
            className="w-full bg-transparent pl-4 pr-14 py-3 text-[14px] focus:outline-none text-foreground placeholder:text-muted-foreground transition-colors"
            disabled={isThinking}
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="absolute right-1 top-1 bottom-1 flex items-center justify-center w-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[16px] disabled:opacity-50 disabled:hover:bg-primary transition-colors"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
