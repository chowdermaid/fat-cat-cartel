import { ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AuthAccessStateProps {
  title?: string;
  description: string;
  error?: string | null;
  checking?: boolean;
  showLogin?: boolean;
  onLogin?: () => void;
}

export function AuthAccessState({
  title = "Admin Panel",
  description,
  error,
  checking,
  showLogin = true,
  onLogin,
}: AuthAccessStateProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {showLogin && onLogin && (
            <Button type="button" className="w-full" onClick={onLogin} disabled={checking}>
              {checking ? "Checking Discord..." : "Login with Discord"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
