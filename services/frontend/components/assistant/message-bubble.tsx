"use client";

import { useState } from "react";
import { Copy, Check, ThumbsUp, ThumbsDown, Bot, User } from "lucide-react";
import { AssistantMarkdown } from "./assistant-markdown";
import { ThinkingAccordion } from "./thinking-accordion";
import { SparklineWidget } from "./artifacts/sparkline-widget";
import { WhatIfWidget } from "./artifacts/what-if-widget";
import { ProposalCard } from "./artifacts/proposal-card";
import { CitationPopover } from "./artifacts/citation-popover";
import type { ChatMessage, ChatArtifact } from "@/lib/agent/types";

interface MessageBubbleProps {
  message: ChatMessage;
  onFeedback?: (messageId: string, rating: 'thumbs_up' | 'thumbs_down') => void;
}

export function MessageBubble({ message, onFeedback }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'thumbs_up' | 'thumbs_down' | null>(
    message.feedback?.rating || null
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (rating: 'thumbs_up' | 'thumbs_down') => {
    setFeedbackGiven(rating);
    onFeedback?.(message.id, rating);
  };

  const isModel = message.role === "model";

  return (
    <div className={`flex gap-3 text-sm ${isModel ? "items-start" : "flex-row-reverse"}`}>
      <div
        className={`flex-none w-8 h-8 rounded-full flex items-center justify-center border ${
          isModel
            ? "bg-secondary text-primary border-border"
            : "bg-primary text-primary-foreground border-primary"
        }`}
      >
        {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      <div className={`flex-1 max-w-[85%] space-y-2`}>
        {/* Thinking Accordion */}
        {isModel && message.thinking && (
          <ThinkingAccordion thinking={message.thinking} />
        )}

        {/* Message Content Bubble */}
        <div
          className={`p-4 rounded-2xl ${
            isModel
              ? "bg-muted/40 border border-border/60 text-foreground"
              : "bg-primary text-primary-foreground ml-auto"
          }`}
        >
          {isModel ? (
            <AssistantMarkdown>{message.content}</AssistantMarkdown>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}

          {/* Embedded Artifacts */}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="pt-2 space-y-2">
              {message.artifacts.map((art: ChatArtifact, i: number) => {
                if (art.type === "sparkline") return <SparklineWidget key={i} artifact={art} />;
                if (art.type === "what_if_delta") return <WhatIfWidget key={i} artifact={art} />;
                if (art.type === "proposal") return <ProposalCard key={i} artifact={art} />;
                if (art.type === "citation") return <CitationPopover key={i} artifact={art} />;
                return null;
              })}
            </div>
          )}
        </div>

        {/* Footer Actions (Copy, Thumbs Up/Down) */}
        {isModel && message.status === "completed" && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground px-1">
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
              title="Copy answer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            <div className="h-3 w-px bg-border mx-1" />

            <button
              onClick={() => handleFeedback("thumbs_up")}
              className={`p-1 rounded hover:text-foreground hover:bg-muted transition-colors ${
                feedbackGiven === "thumbs_up" ? "text-emerald-500" : ""
              }`}
              title="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleFeedback("thumbs_down")}
              className={`p-1 rounded hover:text-foreground hover:bg-muted transition-colors ${
                feedbackGiven === "thumbs_down" ? "text-rose-500" : ""
              }`}
              title="Report issue"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
