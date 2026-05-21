import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import type { Collectible } from "@/features/fc-collection/types";

const CANVAS_SIZE = 480;
const R = 234;
const PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
];

function drawWheel(ctx: CanvasRenderingContext2D, mounts: Collectible[]) {
  const N = mounts.length;
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  if (N === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = "#374151";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#1f2937";
    ctx.fill();
    return;
  }

  const segRad = (Math.PI * 2) / N;

  for (let i = 0; i < N; i++) {
    const startAngle = -Math.PI / 2 + i * segRad;
    const endAngle = startAngle + segRad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw text labels when segments are large enough to be readable
  const textRadius = R * 0.62;
  const arcLen = textRadius * segRad;
  const fontSize = Math.min(11, Math.floor(arcLen / 8));

  if (fontSize >= 7) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";

    for (let i = 0; i < N; i++) {
      const midAngle = -Math.PI / 2 + (i + 0.5) * segRad;
      const tx = cx + textRadius * Math.cos(midAngle);
      const ty = cy + textRadius * Math.sin(midAngle);

      ctx.save();
      ctx.translate(tx, ty);

      // Rotate text radially; flip left-side segments so text reads correctly
      const norm = ((midAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const flip = norm > Math.PI / 2 && norm < (3 * Math.PI) / 2;
      ctx.rotate(midAngle + (flip ? Math.PI : 0));

      // Estimate max chars from available arc width
      const maxChars = Math.max(4, Math.floor(arcLen / (fontSize * 0.62)));
      const name =
        mounts[i].name.length > maxChars
          ? mounts[i].name.slice(0, maxChars - 2) + ".."
          : mounts[i].name;

      ctx.fillText(name, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // Center hub
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#1f2937";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

interface SpinWheelProps {
  mounts: Collectible[];
  spinTrigger: number;
  onSpinComplete: (mount: Collectible) => void;
}

export function SpinWheel({ mounts, spinTrigger, onSpinComplete }: SpinWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spotlightIconRef = useRef<HTMLImageElement>(null);
  const spotlightNameRef = useRef<HTMLSpanElement>(null);
  const currentRotRef = useRef(0);
  const isSpinningRef = useRef(false);

  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawWheel(ctx, mounts);
    canvas.style.transform = `rotate(${currentRotRef.current}deg)`;

    if (mounts.length > 0) {
      const segDeg = 360 / mounts.length;
      const normalized = ((-currentRotRef.current % 360) + 360) % 360;
      const idx = Math.floor(normalized / segDeg) % mounts.length;
      if (spotlightIconRef.current) spotlightIconRef.current.src = mounts[idx].icon;
      if (spotlightNameRef.current) spotlightNameRef.current.textContent = mounts[idx].name;
    } else {
      if (spotlightIconRef.current) spotlightIconRef.current.src = "";
      if (spotlightNameRef.current) spotlightNameRef.current.textContent = "";
    }
  }, [mounts]);

  useEffect(() => {
    if (spinTrigger === 0) return;
    if (isSpinningRef.current || mounts.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setTooltip(null);
    isSpinningRef.current = true;
    const N = mounts.length;
    const segDeg = 360 / N;
    const winnerIdx = Math.floor(Math.random() * N);
    // Compute how far to rotate so segment winnerIdx lands under the pointer.
    // The pointer sits at normalized=0; segment i's center is at (i+0.5)*segDeg.
    // We need: (-(currentRot + extra)) mod 360 == (winnerIdx+0.5)*segDeg
    const currentNorm = ((currentRotRef.current % 360) + 360) % 360;
    const offset = ((360 - (winnerIdx + 0.5) * segDeg - currentNorm) % 360 + 360) % 360;
    const targetRot = currentRotRef.current + 1800 + offset;
    const proxy = { rot: currentRotRef.current };

    animate(proxy, {
      rot: targetRot,
      duration: 5000,
      easing: "easeOutQuart",
      onUpdate: () => {
        if (canvas) canvas.style.transform = `rotate(${proxy.rot}deg)`;
        const normalized = ((-proxy.rot % 360) + 360) % 360;
        const idx = Math.floor(normalized / segDeg) % N;
        if (spotlightIconRef.current) spotlightIconRef.current.src = mounts[idx].icon;
        if (spotlightNameRef.current) spotlightNameRef.current.textContent = mounts[idx].name;
      },
      onComplete: () => {
        currentRotRef.current = targetRot % 360;
        if (canvas) canvas.style.transform = `rotate(${currentRotRef.current}deg)`;
        const normalized = ((-currentRotRef.current % 360) + 360) % 360;
        const finalIdx = Math.floor(normalized / segDeg) % N;
        if (spotlightIconRef.current) spotlightIconRef.current.src = mounts[finalIdx].icon;
        if (spotlightNameRef.current) spotlightNameRef.current.textContent = mounts[finalIdx].name;
        isSpinningRef.current = false;
        onSpinComplete(mounts[winnerIdx]);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinTrigger]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (isSpinningRef.current || mounts.length === 0) {
      setTooltip(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const scale = rect.width / CANVAS_SIZE;

    if (Math.sqrt(dx * dx + dy * dy) > R * scale) {
      setTooltip(null);
      return;
    }

    // Un-rotate mouse offset into canvas coordinate space
    const rotRad = (-currentRotRef.current * Math.PI) / 180;
    const unrotX = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
    const unrotY = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);

    const angle = Math.atan2(unrotY, unrotX);
    const angleFromTop = ((angle + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const N = mounts.length;
    const idx = Math.floor(angleFromTop / ((Math.PI * 2) / N)) % N;

    setTooltip({ name: mounts[idx].name, x: e.clientX + 14, y: e.clientY - 8 });
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl">
      <div className="flex items-center gap-3 h-12 mb-1 px-4 py-2 rounded-xl border bg-muted/50 min-w-0 w-full">
        <img
          ref={spotlightIconRef}
          src=""
          alt=""
          className="h-8 w-8 rounded shrink-0 object-contain"
        />
        <span ref={spotlightNameRef} className="text-sm font-medium truncate" />
      </div>

      <div className="relative flex flex-col items-center w-full">
        <svg
          width="24"
          height="20"
          viewBox="0 0 24 20"
          className="z-10 mb-[-2px] text-foreground"
          aria-hidden
        >
          <polygon points="12,18 3,2 21,2" fill="currentColor" />
        </svg>
        <div className="w-full aspect-square">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full h-full rounded-full cursor-crosshair"
            style={{ transformOrigin: "center" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
          />
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded border bg-popover text-popover-foreground text-xs shadow-md pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.name}
        </div>
      )}
    </div>
  );
}
