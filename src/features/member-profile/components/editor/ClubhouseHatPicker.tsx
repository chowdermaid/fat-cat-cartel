import { useId, useState } from "react";
import { User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLUBHOUSE_HATS, getClubhouseHat, type ClubhouseHatId } from "@/features/home/utils/clubhouseHats";
import { ClubhouseHat } from "../profile/ClubhouseHat";

export function ClubhouseHatPicker({ value, avatarUrl, onChange, disabled }: {
  value?: string | null;
  avatarUrl?: string | null;
  onChange: (id: ClubhouseHatId) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hat = getClubhouseHat(value);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Clubhouse hat</Label>
      <Select value={hat.id} onValueChange={(next) => onChange(getClubhouseHat(next).id)} disabled={disabled}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CLUBHOUSE_HATS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <div role="img" aria-label={`${hat.label} preview`} className="flex h-36 items-end justify-center rounded-md bg-muted/30 pb-5">
        <div className="relative isolate h-16 w-16">
          <span className="block h-full w-full overflow-hidden rounded-full bg-muted ring-2 ring-border">
            {avatarUrl && avatarUrl !== failedUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" onError={() => setFailedUrl(avatarUrl)} />
            ) : <User aria-hidden="true" className="m-auto h-full w-1/2 text-muted-foreground" />}
          </span>
          <ClubhouseHat hatId={hat.id} size={64} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Worn in the homepage Clubhouse. Saved with your profile.</p>
    </div>
  );
}
