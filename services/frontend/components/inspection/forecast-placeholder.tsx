import { LineChart } from "lucide-react";

export function ForecastPlaceholder() {
  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 flex items-center gap-2">
        <LineChart className="size-3" /> Fouling Forecast
      </h3>
      <div className="h-32 bg-white/40 border border-dashed border-border/40 rounded-[20px] flex items-center justify-center relative overflow-hidden">
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 z-10">Forecast Engine Not Connected</span>
      </div>
    </section>
  );
}
