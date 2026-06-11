import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminHeaderProps = {
  title: string;
  description: string;
  onLogout: () => void;
  onBack?: () => void;
};

export function AdminHeader({
  title,
  description,
  onLogout,
  onBack,
}: AdminHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onLogout}>
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
