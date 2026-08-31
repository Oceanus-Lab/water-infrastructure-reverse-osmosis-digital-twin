import { ValidationReportPanel } from "@/components/simulation/validation-report-panel";
import { WhatIfForm } from "@/components/simulation/what-if-form";

export default function SimulationPage() {
  return (
    <main className="flex-1 overflow-y-auto p-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          {/* Heading matches its navigation label — the page previously said "Validation &
              Economics" under a tab labelled "Physical Simulation" (FR-003). */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Physical Simulation</h1>
          <p className="text-muted-foreground mt-2">
            Solve the membrane flowsheet at any operating point, and check the model against
            ground truth.
          </p>
        </div>

        <WhatIfForm />

        <ValidationReportPanel />
      </div>
    </main>
  );
}
