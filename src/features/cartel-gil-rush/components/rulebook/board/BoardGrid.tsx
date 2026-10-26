import { Crown, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BOARD_COLUMNS, boardConnections } from "../../../boardData";
import { useBoardGeometry } from "../../../hooks/useBoardGeometry";
import { tileArtwork } from "../../../tileArtwork";
import { boardCells, describeBoardCell, getBoardPosition } from "../../../utils/board";
import { BoardConnections } from "./BoardConnections";

const tileFaces = {
  shark: "bg-[#10BDCD] text-[#171717]",
  mushroom: "bg-[#741744] text-[#FFFFFF]",
  moogle: "bg-[#C18B43] text-[#171717]",
  chocobo: "bg-[#FF741F] text-[#171717]",
  fatcat: "bg-[#F4CB54] text-[#171717]",
  ladder: "bg-[#C4E94B] text-[#171717]",
  "red-arrow": "bg-[#B60922] text-[#FFFFFF]",
  finish: "bg-[#FFD451] text-[#171717]",
};

interface BoardGridProps {
  active: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
}

export function BoardGrid({ active, selected, onSelect }: BoardGridProps) {
  const { canvasRef, geometry } = useBoardGeometry(active);
  const route = boardConnections.find(({ id }) => id === selected);

  return (
    <div ref={canvasRef} data-board-canvas="" className="relative isolate mx-auto w-full min-w-[840px] max-w-[1200px] px-7 pt-1 pb-5">
      <ol aria-label="90-tile serpentine board" className="relative grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1">
        {boardCells.map((cell) => {
          const { row, column } = getBoardPosition(cell.number);
          const description = cell.number === 1 ? "Tile 1. Start" : describeBoardCell(cell);
          const highlighted = route?.from === cell.number || route?.to === cell.number;
          const Landmark = cell.number === 1 ? Flag : cell.symbol === "finish" ? Crown : null;
          const face = <span aria-hidden="true" className="relative z-20 block size-full">
            <span className="absolute top-1 left-1 text-xs leading-none font-extrabold">{cell.number}</span>
            {Landmark ? <Landmark className="absolute top-[60%] left-1/2 size-[52%] max-w-9 -translate-x-1/2 -translate-y-1/2 text-[#805512]" /> : cell.symbol && cell.symbol !== "finish" && !cell.outgoing ? <img src={tileArtwork[cell.symbol]} alt="" className="absolute top-[60%] left-1/2 size-[52%] max-w-9 -translate-x-1/2 -translate-y-1/2 object-contain" /> : null}
          </span>;
          return <li key={cell.number} data-board-tile={cell.number} data-board-symbol={cell.symbol ?? undefined} aria-label={cell.outgoing ? undefined : description} title={description} style={{ gridRow: row + 1, gridColumn: column + 1 }} className={cn(
            "relative aspect-square rounded-[2px] border border-black/25 shadow-[inset_0_1px_0_#ffffff40,inset_0_-1px_0_#00000030]",
            cell.number === 1 ? tileFaces.finish : cell.symbol ? tileFaces[cell.symbol] : cell.incoming.some(({ kind }) => kind === "ladder") ? tileFaces.ladder : Math.floor((cell.number - 1) / BOARD_COLUMNS) % 2 === 0 ? "bg-[#696664] text-[#FFFFFF]" : "bg-[#F2EFE7] text-[#171717]",
            highlighted && "ring-2 ring-amber-500 ring-offset-1 ring-offset-background",
          )}>
            {cell.outgoing ? <Button variant="ghost" aria-label={description} aria-pressed={selected === cell.outgoing.id} className="block h-full w-full rounded-[inherit] p-0 text-inherit hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-amber-600" onClick={() => onSelect(cell.outgoing!.id)}>{face}</Button> : face}
          </li>;
        })}
      </ol>
      <p className="relative z-20 mt-6 max-w-44 text-xs leading-relaxed font-semibold text-balance text-amber-700 dark:text-[#FFD451]">Start here, moving horizontally across</p>
      <BoardConnections geometry={geometry} selected={selected} />
    </div>
  );
}
