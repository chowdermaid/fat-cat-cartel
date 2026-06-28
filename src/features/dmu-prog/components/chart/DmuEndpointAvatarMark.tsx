import type { PlayerWithColor } from "../../types";

export function DmuEndpointAvatarMark({
  cx,
  cy,
  players,
  onSelect,
}: {
  cx?: number;
  cy?: number;
  players: PlayerWithColor[];
  onSelect: (lodestoneId: string) => void;
}) {
  if (cx == null || cy == null) return null;
  const width = Math.max(28, 18 + players.length * 16);
  return (
    <g transform={`translate(${cx + 8}, ${cy - 14})`} className="cursor-pointer">
      {players.slice(0, 4).map((player, index) => (
        <g
          key={player.lodestoneId}
          transform={`translate(${index * 14}, 0)`}
          onClick={() => onSelect(player.lodestoneId)}
        >
          <circle cx="14" cy="14" r="13" fill="hsl(var(--background))" stroke={player.color} strokeWidth="2" />
          {player.avatarUrl ? (
            <image href={player.avatarUrl} x="3" y="3" width="22" height="22" clipPath="circle(11px at 14px 14px)" />
          ) : (
            <text x="14" y="18" textAnchor="middle" fontSize="10" fill="currentColor">
              {player.name.slice(0, 1)}
            </text>
          )}
          {player.bestProgress === 0 && (
            <g transform="translate(16, -4)">
              <circle cx="5" cy="5" r="5" fill="hsl(var(--background))" />
              <path
                d="M1.5 6.8h7l-.7 1.7H2.2L1.5 6.8Zm.3-4 2.2 2 1-3 1 3 2.2-2-.6 3.4H2.4L1.8 2.8Z"
                fill="hsl(var(--primary))"
              />
            </g>
          )}
        </g>
      ))}
      {players.length > 4 && (
        <text x={width} y="18" fontSize="10" fill="currentColor">
          +{players.length - 4}
        </text>
      )}
    </g>
  );
}
