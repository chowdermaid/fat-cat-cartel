import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePetCounter } from "../../hooks/usePetCounter";
import happyCat from "../../../../assets/fatcat/fc_happy.png";

export function PetFatCatCard() {
  const { pets, addPet } = usePetCounter();

  return (
    <Card className="journal-item">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <Sparkles className="h-4 w-4 text-primary" />
          Pet Fat Cat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 rounded-md border bg-background/70 p-3">
          <img
            src={happyCat}
            alt="Happy fat cat"
            className="h-16 w-16 shrink-0 object-contain"
          />
          <p className="text-sm text-muted-foreground">
            Pets logged:{" "}
            <span className="font-medium text-foreground">{pets}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={addPet}>
          Pet the fat cat
        </Button>
      </CardContent>
    </Card>
  );
}
