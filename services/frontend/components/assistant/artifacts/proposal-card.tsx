"use client";

import { useState } from "react";
import { ShieldCheck, Check, Loader2 } from "lucide-react";
import type { ProposalArtifact } from "@/lib/agent/types";

interface ProposalCardProps {
  artifact: ProposalArtifact;
}

export function ProposalCard({ artifact }: ProposalCardProps) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'dismissed'>(artifact.status || 'pending');
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: artifact.proposalId,
          unitId: artifact.unitId,
          action: artifact.action,
          assumedCipCost: artifact.economicImpact?.assumedCipCost,
          assumedElectricity: artifact.economicImpact?.assumedElectricity,
        }),
      });
      if (res.ok) {
        setStatus("approved");
      }
    } catch (err) {
      console.error("Failed to approve proposal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-3.5 my-2.5 shadow-sm text-xs">
      <div className="flex items-center space-x-2 mb-2 text-primary font-semibold">
        <ShieldCheck className="w-4 h-4" />
        <span>Gated Action Proposal — {artifact.action.replace("_", " ")}</span>
      </div>

      <div className="space-y-1.5 text-muted-foreground mb-3">
        <div>
          Target Unit: <span className="font-mono font-bold text-foreground">{artifact.unitId}</span>
        </div>
        {artifact.economicImpact && (
          <div className="font-mono text-[11px] text-foreground">
            Estimated Net Benefit:{" "}
            <span className="text-emerald-500 font-bold">
              +${artifact.economicImpact.netBenefit?.toLocaleString() || "1,250"}
            </span>
          </div>
        )}
      </div>

      {status === "approved" ? (
        <div className="flex items-center space-x-2 py-1.5 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
          <Check className="w-3.5 h-3.5" />
          <span>Approved & Recorded to Audit Log</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>Approve & Record Decision</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
