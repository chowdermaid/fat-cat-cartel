import type { ComplaintCoinMark } from "../types";

type PotatoCoinIconProps = {
  mark?: ComplaintCoinMark;
  className?: string;
};

export function PotatoCoinIcon({
  mark = "plus",
  className = "h-full w-full",
}: PotatoCoinIconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M17 9c8-6 24-5 31 2 6 6 10 21 6 31-4 11-15 17-28 14C13 53 7 45 8 32 9 21 10 14 17 9Z"
        fill="#D6A634"
        stroke="#7A491D"
        strokeWidth="4"
      />
      <circle cx="20" cy="23" r="2.2" fill="#A46E25" />
      <circle cx="45" cy="39" r="2.4" fill="#A46E25" />
      {mark === "plus" && (
        <text x="32" y="41" textAnchor="middle" fontSize="25" fontWeight="900" fill="#4A2B1F">
          +1
        </text>
      )}
      {mark === "spud" && (
        <text x="32" y="38" textAnchor="middle" fontSize="13" fontWeight="900" fill="#4A2B1F">
          SPUD
        </text>
      )}
      {mark === "potato" && (
        <path
          d="M24 21c5-4 14-3 17 2 4 6 1 15-6 18-7 2-14-2-14-9 0-5 0-8 3-11Z"
          fill="#F8E6C8"
          stroke="#4A2B1F"
          strokeWidth="2.5"
        />
      )}
      {mark === "grumpy" && (
        <g fill="none" stroke="#4A2B1F" strokeLinecap="round" strokeWidth="3">
          <path d="m20 27 8 3M44 27l-8 3M23 43c5-4 13-4 18 0" />
        </g>
      )}
    </svg>
  );
}
