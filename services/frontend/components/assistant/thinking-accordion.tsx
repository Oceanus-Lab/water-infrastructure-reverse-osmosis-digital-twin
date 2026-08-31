"use client";

import { useState } from "react";
import { ChevronDown, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { ThinkingState, SpecialistConsultation } from "@/lib/agent/types";

interface ThinkingAccordionProps {
  thinking: ThinkingState;
}

export function ThinkingAccordion({ thinking }: ThinkingAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!thinking) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden mb-3 text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left font-medium text-foreground/90"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>{thinking.summary || "Thinking & Multi-Agent Coordination"}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-3.5 py-3 space-y-2.5 border-t border-border/40">
          {thinking.specialistsConsulted && thinking.specialistsConsulted.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Specialist Consultations
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {thinking.specialistsConsulted.map((s: SpecialistConsultation) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-background/80 border border-border/40"
                  >
                    <div className="flex items-center space-x-2">
                      {s.status === "completed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : s.status === "running" ? (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span className="font-mono capitalize font-medium text-foreground">
                        {s.id}
                      </span>
                    </div>
                    {s.durationMs > 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {s.durationMs}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {thinking.reflexionCritique && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px]">
              <span className="font-semibold">Self-Critique & Grounding Reflexion:</span>{" "}
              {thinking.reflexionCritique}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
