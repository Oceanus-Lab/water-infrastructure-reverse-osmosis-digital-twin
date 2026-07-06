import { AlertItem } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export function AlertsFeed({ alerts }: { alerts: AlertItem[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 mt-2 px-10 pb-10">
      <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 flex items-center gap-2">
        <TriangleAlert className="size-3" /> Active Alerts
      </h3>
      <div className="flex flex-col gap-3">
        {alerts.map(alert => (
          <Alert key={alert.id} className="bg-white border-border/40 rounded-[16px] shadow-sm">
            <TriangleAlert className="h-4 w-4 text-primary" />
            <AlertTitle className="font-extrabold flex gap-2">
              <span className="text-primary">{alert.unitId}</span> {alert.message}
            </AlertTitle>
            <AlertDescription className="text-[11px] opacity-80 mt-1 font-medium leading-relaxed text-foreground">
              {alert.evidence}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
}
