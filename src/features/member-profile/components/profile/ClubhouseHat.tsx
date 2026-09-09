import fedora from "@/assets/clubhouse/hats/fat-cat-cartel-fedora.svg";
import flatCap from "@/assets/clubhouse/hats/cartel-flat-cap.svg";
import witchHat from "@/assets/clubhouse/hats/cartel-witch-hat.svg";
import ears from "@/assets/clubhouse/hats/fat-cat-avatar-ears.svg";
import crown from "@/assets/clubhouse/hats/cartel-tiny-crown.svg";
import { getClubhouseHat, type ClubhouseHatId } from "@/features/home/utils/clubhouseHats";

const assets: Record<ClubhouseHatId, string> = {
  "fat-cat-cartel-fedora": fedora,
  "cartel-flat-cap": flatCap,
  "cartel-witch-hat": witchHat,
  "fat-cat-avatar-ears": ears,
  "cartel-tiny-crown": crown,
};

export function ClubhouseHat({ hatId, size }: { hatId?: string | null; size: number }) {
  const hat = getClubhouseHat(hatId);
  return (
    <img
      src={assets[hat.id]} alt="" aria-hidden="true" draggable={false}
      data-clubhouse-hat={hat.id}
      className={`pointer-events-none absolute max-w-none select-none${hat.id === "fat-cat-avatar-ears" ? " -z-10" : ""}`}
      style={{
        width: size * hat.width, left: size * hat.left, top: size * hat.top,
        transform: `rotate(${hat.rotation}deg)`,
        transformOrigin: `${hat.origin.x * 100}% ${hat.origin.y * 100}%`,
      }}
    />
  );
}
