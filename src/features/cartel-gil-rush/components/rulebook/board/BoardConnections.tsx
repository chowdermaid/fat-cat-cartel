import { useId } from "react";
import { BOARD_COLUMNS, BOARD_ROWS, boardConnections } from "../../../boardData";
import type { BoardGeometry } from "../../../types";
import { getConnectionEndpoints, getFallPath, getLadderLines } from "../../../utils/board";

export function BoardConnections({ geometry, selected }: { geometry: BoardGeometry | null; selected: string | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!geometry) return null;
  const { width, height, centers, cellSize } = geometry;

  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible text-foreground" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <marker id={`${id}-fall`} markerWidth="16" markerHeight="16" refX="11" refY="8" orient="auto" markerUnits="userSpaceOnUse" overflow="visible">
          <path d="M 3 2 L 11 8 L 3 14" fill="none" stroke="#BF1020" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <path data-fall-arrowhead="" d="M 3 2 L 11 8 L 3 14" fill="none" stroke="#FF2434" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id={`${id}-walk`} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 9 4.5 L 0 9 Z" fill="currentColor" /></marker>
        <marker id={`${id}-start`} className="text-amber-700 dark:text-[#FFD451]" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 9 4.5 L 0 9 Z" fill="currentColor" /></marker>
      </defs>
      <g data-board-direction-cues="" opacity=".85" stroke="currentColor" strokeWidth="3.25" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {Array.from({ length: BOARD_ROWS }, (_, row) => {
          const first = centers[row * BOARD_COLUMNS + 1], last = centers[(row + 1) * BOARD_COLUMNS];
          if (!first || !last) return null;
          const direction = row % 2 === 0 ? 1 : -1;
          const next = centers[(row + 1) * BOARD_COLUMNS + 1];
          const edge = last.x + direction * (cellSize / 2 + 5);
          const outer = edge + direction * 15;
          return <g key={row}>
            {row === 0 && <path data-board-start-arrow="" className="text-amber-700 dark:text-[#FFD451]" d={`M ${first.x - cellSize / 2} ${first.y + cellSize / 2 + 11} h ${cellSize * 1.5}`} markerEnd={`url(#${id}-start)`} />}
            {next && <path d={`M ${edge} ${last.y} H ${outer} V ${next.y} H ${edge}`} markerEnd={`url(#${id}-walk)`} />}
          </g>;
        })}
      </g>
      {boardConnections.map((connection) => {
        const source = centers[connection.from], destination = centers[connection.to];
        if (!source || !destination) return null;
        const { from, to } = getConnectionEndpoints(source, destination, cellSize);
        const opacity = selected && selected !== connection.id ? 0.12 : 1;
        return <g key={connection.id} data-board-connection={connection.id} data-from={connection.from} data-to={connection.to} opacity={opacity} className="transition-opacity motion-reduce:transition-none" strokeLinecap="round" strokeLinejoin="round">
          {connection.kind === "ladder" ? getLadderLines(from, to, cellSize).map((line, lineIndex) => <g key={lineIndex}>
            <line x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} stroke="#89AB29" strokeWidth={cellSize * 0.055 + 1.5} />
            <line x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} stroke="#B9DF3D" strokeWidth={cellSize * 0.055} />
          </g>) : <>
            <path d={getFallPath(from, to)} fill="none" stroke="#BF1020" strokeWidth="5.5" />
            <path data-fall-route="" d={getFallPath(from, to)} fill="none" stroke="#FF2434" strokeWidth="3.5" markerEnd={`url(#${id}-fall)`} />
          </>}
        </g>;
      })}
    </svg>
  );
}
