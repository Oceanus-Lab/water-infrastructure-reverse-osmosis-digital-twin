import Image from "next/image";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { UnitHealth } from "@/lib/types";
import { useReplayStore } from "@/lib/store/replay-store";
import { HoverSummaryCard } from "./hover-summary-card";

interface EquipmentSpriteProps {
  unit?: UnitHealth | undefined;
  id: string;
  label: string;
  imageSrc: string;
  className?: string;
  isDefault?: boolean;
}

export function EquipmentSprite({ unit, id, label, imageSrc, className, isDefault }: EquipmentSpriteProps) {
  const { selectedUnitId, setSelectedUnitId } = useReplayStore();
  const isActive = isDefault ? (selectedUnitId === null || selectedUnitId === id) : selectedUnitId === (unit?.id || id);

  return (
    <HoverSummaryCard unit={unit}>
      <button
        onClick={() => setSelectedUnitId(isDefault ? null : (unit?.id || id))}
      aria-label={`Inspect ${label}`}
      aria-pressed={isActive}
      className={cn(
        "group flex-shrink-0 w-[220px] flex flex-col p-3 rounded-[20px] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "bg-white border border-border/40 cursor-pointer",
        !isActive && "hover:border-border/80 hover:bg-black/5",
        isActive && "ring-1 ring-primary/40 border-primary bg-primary/5",
        className
      )}
    >
      <div className="relative w-full aspect-[4/3] flex items-center justify-center overflow-hidden">
        <Image
          src={imageSrc}
          alt={label}
          fill
          className="object-contain group-hover:scale-[1.03] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] mix-blend-multiply"
        />
      </div>
      
      <div className="flex flex-col items-start text-left gap-1 w-full mt-1 pt-2 border-t border-border/20">
        <h3 className="text-[12px] font-bold tracking-tight text-foreground uppercase">{label}</h3>
        {unit ? (
          <StatusBadge score={unit.score} scoreSource={unit.scoreSource} showDetails={false} />
        ) : (
          <div className="h-[20px]" />
        )}
      </div>
    </button>
    </HoverSummaryCard>
  );
}
