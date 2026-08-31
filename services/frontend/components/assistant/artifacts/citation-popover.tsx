"use client";

import { useState } from "react";
import { BookOpen, ExternalLink, X } from "lucide-react";
import type { CitationArtifact } from "@/lib/agent/types";

interface CitationPopoverProps {
  artifact: CitationArtifact;
}

export function CitationPopover({ artifact }: CitationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="inline-block my-1 mr-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors"
      >
        <BookOpen className="w-3 h-3 text-primary" />
        <span>{artifact.documentName}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <div className="font-semibold text-foreground flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>{artifact.documentName}</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] text-muted-foreground">
              Section: <span className="font-medium text-foreground">{artifact.section || "Standard Operating Procedure"}</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border/40 font-mono text-[11px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {artifact.snippet}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
