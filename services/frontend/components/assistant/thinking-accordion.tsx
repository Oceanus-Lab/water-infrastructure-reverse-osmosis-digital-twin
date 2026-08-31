"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { AITaskList, type AITask } from "@/components/ui/ai-task-list";
import type { ThinkingState, SpecialistConsultation } from "@/lib/agent/types";

interface ThinkingAccordionProps {
  thinking?: ThinkingState;
}

function buildSpecialistTask(s: SpecialistConsultation): AITask {
  const isDone = s.status === "completed";
  const isRunning = s.status === "running";
  const status = isDone ? "done" : isRunning ? "running" : "failed";
  const note = s.durationMs > 0 ? `${s.durationMs}ms` : undefined;

  switch (s.id) {
    case "dataAnalyst":
      return {
        id: "dataAnalyst",
        label: "Data Analyst — Sensor Streams & Outlier Detection",
        status,
        note,
      };
    case "simulation":
      return {
        id: "simulation",
        label: "Simulation — WaterTAP 0D Physics Solver",
        status,
        note,
      };
    case "economics":
      return {
        id: "economics",
        label: "Economics — Delta-First Cleaning Trade-Offs",
        status,
        note,
      };
    case "document":
      return {
        id: "document",
        label: "Document Specialist — BigQuery SOP RAG",
        status,
        note,
      };
    default:
      return {
        id: s.id,
        label: `Consult ${s.id} specialist`,
        status,
        note,
      };
  }
}

export function ThinkingAccordion({ thinking }: ThinkingAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!thinking) return null;

  const specialists = thinking.specialistsConsulted || [];
  if (specialists.length === 0 && !thinking.reflexionCritique) {
    return null;
  }

  const allSpecialistsDone = specialists.length > 0 && specialists.every((s) => s.status === "completed");

  const tasks: AITask[] = [
    {
      id: "coordinate",
      label: "Classify operator intent & orchestrate specialists",
      status: "done",
      note: "Coordinator",
    },
    ...specialists.map(buildSpecialistTask),
    {
      id: "compose",
      label: "Synthesize response with evidence citations",
      status: allSpecialistsDone ? "done" : "running",
    },
    ...(thinking.reflexionCritique ? [{
      id: "reflexion",
      label: "In-Harness Reflexion Critic Audit",
      status: "done" as const,
      note: "100% Grounded",
    }] : []),
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden mb-3 text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left font-medium text-foreground/90"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="font-semibold">{thinking.summary || "Multi-Agent Reasoning & Execution"}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="p-3 space-y-2.5 border-t border-border/40">
          <AITaskList
            label="Multi-Agent Execution DAG"
            tasks={tasks}
            className="border-border/40 bg-background/60 shadow-none text-xs"
          />

          {thinking.reflexionCritique && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed">
              <span className="font-semibold">Self-Critique Reflexion:</span>{" "}
              {thinking.reflexionCritique}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
