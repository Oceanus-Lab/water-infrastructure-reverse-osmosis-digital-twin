import Image from "next/image";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { UnitHealth } from "@/lib/types";
import { useReplayStore } from "@/lib/store/replay-store";

interface EquipmentSpriteProps {
  unit: UnitHealth | undefined;
  id: string;
  label: string;
  imageSrc: string;
  className?: string;
}

export function EquipmentSprite({ unit, id, label, imageSrc, className }: EquipmentSpriteProps) {
  const { selectedUnitId, setSelectedUnitId } = useReplayStore();
  const isActive = selectedUnitId === (unit?.id || id);

  return (
    <button
      onClick={() => setSelectedUnitId(unit?.id || id)}
      aria-pressed={isActive}
      className={cn(
        "group flex-shrink-0 w-[260px] flex flex-col gap-4 p-5 rounded-[20px] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "bg-white border border-border/40 cursor-pointer shadow-sm",
        "hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-black/20",
        isActive && "ring-1 ring-black border-black shadow-md",
        className
      )}
    >
      <div className="relative w-full aspect-[4/3] flex items-center justify-center overflow-hidden">
        <Image
          src={imageSrc}
          alt={label}
          fill
          className="object-contain p-2 group-hover:scale-[1.03] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] mix-blend-multiply"
        />
      </div>
      
      <div className="flex flex-col items-start text-left gap-2 w-full mt-2 pt-4 border-t border-border/30">
        <h3 className="text-[14px] font-bold tracking-tight text-foreground uppercase">{label}</h3>
        {unit ? (
          <StatusBadge score={unit.score} scoreSource={unit.scoreSource} showDetails={false} />
        ) : (
          <div className="h-[20px]" />
        )}
      </div>
    </button>
  );
}
