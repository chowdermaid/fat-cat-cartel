import { useLayoutEffect, useRef, useState } from "react";
import type { BoardGeometry } from "../types";
import { boardGeometryTiles } from "../utils/board";

export function useBoardGeometry(active: boolean) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<BoardGeometry | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !canvas) return;
    const viewport = canvas.closest<HTMLElement>("[data-radix-scroll-area-viewport]");
    if (viewport) {
      viewport.tabIndex = 0;
      viewport.setAttribute("role", "region");
      viewport.setAttribute("aria-label", "Board diagram; scroll horizontally");
    }
    let frame = 0;
    let disposed = false;
    const measure = () => {
      frame = 0;
      if (disposed) return;
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const centers: BoardGeometry["centers"] = {};
      let cellSize = 0;
      for (const number of boardGeometryTiles) {
        const cell = canvas.querySelector<HTMLElement>(`[data-board-tile="${number}"]`);
        if (!cell) continue;
        const rect = cell.getBoundingClientRect();
        centers[number] = { x: rect.left + rect.width / 2 - bounds.left, y: rect.top + rect.height / 2 - bounds.top };
        cellSize = rect.width;
      }
      setGeometry({ width: bounds.width, height: bounds.height, cellSize, centers });
    };
    const schedule = () => { if (!disposed && !frame) frame = window.requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    schedule();
    return () => {
      disposed = true;
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [active]);

  return { canvasRef, geometry };
}
