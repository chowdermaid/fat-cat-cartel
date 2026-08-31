type PotatoCoinIconProps = {
  className?: string;
};

export function PotatoCoinIcon({
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
      <g fill="none" stroke="#4A2B1F" strokeLinecap="round" strokeWidth="3">
        <path d="m20 27 8 3M44 27l-8 3M23 43c5-4 13-4 18 0" />
      </g>
    </svg>
  );
}
