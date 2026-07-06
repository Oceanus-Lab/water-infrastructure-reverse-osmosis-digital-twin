import { Activity, BotMessageSquare, Send } from "lucide-react";

export function AIAssistantPanel() {
  return (
    <section className="flex flex-col gap-4 mt-auto pt-8">
      <div className="rounded-[20px] border border-border/20 bg-white p-6 flex flex-col gap-5 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-full bg-primary text-white text-[9px] uppercase font-bold tracking-widest text-center py-1 flex items-center justify-center gap-1">
          <Activity className="size-3" /> Connecting to diagnostics backend...
        </div>
        <div className="flex items-center gap-2 text-foreground font-extrabold text-sm uppercase tracking-widest mt-4">
          <BotMessageSquare className="size-4" />
          AI Assistant
        </div>
        <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">
          Analyzing the latest signals. Ask me to forecast fouling accumulation or recommend CIP schedules.
        </p>
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Ask a question..."
            disabled
            className="w-full h-12 rounded-[12px] bg-[#F9F9F8] border border-border/40 text-[12px] text-muted-foreground font-bold px-5 pr-12 cursor-not-allowed outline-none"
          />
          <button disabled className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 cursor-not-allowed">
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
