import { Copy, Globe2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DragonwildsConnectionPanelProps = {
  address: string | null;
  ready: boolean;
  onCopyAddress: () => void;
  onCopyPassword: () => void;
};

export function DragonwildsConnectionPanel({ address, ready, onCopyAddress, onCopyPassword }: DragonwildsConnectionPanelProps) {
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base"><Globe2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />Join Server</CardTitle>
      <CardDescription>{ready ? "Copy the address and password below." : "Start Dragonwilds to view the server address."}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4 text-sm">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Direct address</p>
        <code className="block break-all rounded-md border bg-muted/40 p-3 font-mono text-sm font-semibold">{ready && address ? address : "Awaiting server startup"}</code>
        <Button className="w-full" variant="outline" onClick={onCopyAddress} disabled={!ready || !address}><Copy className="h-4 w-4" />Copy Address</Button>
      </div>
      <div className="space-y-2 border-t pt-4">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase"><LockKeyhole className="h-3.5 w-3.5" />Server password</p>
        <code className="block break-all rounded-md border bg-muted/40 p-3 font-mono text-sm font-semibold">123</code>
        <Button className="w-full" variant="outline" onClick={onCopyPassword}><Copy className="h-4 w-4" />Copy Password</Button>
      </div>
    </CardContent>
  </Card>;
}
