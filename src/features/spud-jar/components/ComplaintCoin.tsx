import type { ComplaintCoinView } from "../types";
import { PotatoCoinIcon } from "./PotatoCoinIcon";

type ComplaintCoinProps = {
  coin: ComplaintCoinView;
  bindElement: (id: number, element: HTMLDivElement | null) => void;
};

export function ComplaintCoin({ coin, bindElement }: ComplaintCoinProps) {
  const size = coin.radius * 2;
  return (
    <div
      ref={(element) => bindElement(coin.id, element)}
      data-coin-id={coin.id}
      className="absolute left-0 top-0 will-change-transform"
      style={{ width: size, height: size }}
    >
      <div className="spud-coin-art h-full w-full will-change-transform">
        <PotatoCoinIcon className="h-full w-full drop-shadow-sm" />
      </div>
    </div>
  );
}
