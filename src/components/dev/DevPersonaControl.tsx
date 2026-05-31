import { useEffect, useState } from "react";
import { RotateCcw, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DEV_AUTH_LAYER_ENABLED,
  DEV_PERSONAS,
  getSelectedDevPersona,
  resetDevMockData,
  setSelectedDevPersona,
  subscribeDevPersona,
  type DevPersonaId,
} from "@/lib/dev/personas";

export function DevPersonaControl() {
  const [personaId, setPersonaId] = useState(() => getSelectedDevPersona().id);

  useEffect(() => {
    if (!DEV_AUTH_LAYER_ENABLED) return;
    return subscribeDevPersona(() => {
      setPersonaId(getSelectedDevPersona().id);
    });
  }, []);

  if (!DEV_AUTH_LAYER_ENABLED) return null;

  return (
    <div className="relative z-10 ml-auto flex min-w-0 items-center gap-2 px-2">
      <label className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground sm:flex">
        <Shield className="h-3.5 w-3.5" />
        Dev Role
      </label>
      <select
        value={personaId}
        onChange={(event) => {
          const nextPersonaId = event.target.value as DevPersonaId;
          setPersonaId(nextPersonaId);
          setSelectedDevPersona(nextPersonaId);
        }}
        className="h-8 max-w-36 rounded-md border border-input bg-background px-2 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring sm:max-w-44"
        aria-label="Dev role"
      >
        {DEV_PERSONAS.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
          resetDevMockData();
          toast.success("Dev mock data reset.");
        }}
        aria-label="Reset dev mock data"
        title="Reset dev mock data"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

