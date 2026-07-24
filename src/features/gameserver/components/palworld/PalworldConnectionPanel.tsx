import { Copy, Globe2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PalworldConnectionPanelProps = {
  address: string | null | undefined;
  password: string;
  ready: boolean;
  onCopyAddress: () => void;
  onCopyPassword: () => void;
};

export function PalworldConnectionPanel({
  address,
  password,
  ready,
  onCopyAddress,
  onCopyPassword,
}: PalworldConnectionPanelProps) {
  return (
    <Card className="pw-connection-panel overflow-hidden border-cyan-500/20 bg-card/95 shadow-lg backdrop-blur">
      <div className="h-1 bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.85),rgba(52,211,153,0.85),transparent)]" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe2 className="h-4 w-4 text-cyan-500" />
          Join Server
        </CardTitle>
        <CardDescription>
          {ready
            ? "Copy the address and password below."
            : "Start Palworld to view the server address."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <div className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Direct address
          </div>
          <div className="rounded-md border bg-muted/40 p-3">
            <code className="block break-all font-mono text-sm font-semibold">
              {ready && address ? address : "Awaiting server startup"}
            </code>
          </div>
          <Button
            className="w-full"
            variant="outline"
            onClick={onCopyAddress}
            disabled={!ready || !address}
          >
            <span data-copy-feedback="address" className="inline-flex">
              <Copy className="h-4 w-4" />
            </span>
            Copy Address
          </Button>
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            <LockKeyhole className="h-3.5 w-3.5" />
            Server password
          </div>
          <div className="rounded-md border bg-muted/40 p-3">
            <code className="block break-all font-mono text-sm font-semibold">
              {password}
            </code>
          </div>
          <Button className="w-full" variant="outline" onClick={onCopyPassword}>
            <span data-copy-feedback="password" className="inline-flex">
              <Copy className="h-4 w-4" />
            </span>
            Copy Password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
