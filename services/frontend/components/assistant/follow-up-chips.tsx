"use client";

import { CornerDownRight } from "lucide-react";

interface FollowUpChipsProps {
  suggestions?: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export function FollowUpChips({ suggestions, onSelect, disabled }: FollowUpChipsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {suggestions.map((s, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(s)}
          disabled={disabled}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground border border-border/60 transition-all disabled:opacity-50 text-left"
        >
          <CornerDownRight className="w-3 h-3 text-primary flex-shrink-0" />
          <span>{s}</span>
        </button>
      ))}
    </div>
  );
}
