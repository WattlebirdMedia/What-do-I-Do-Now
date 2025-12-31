import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Lock } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface PaywallProps {
  onCheckout: () => void;
  isLoading: boolean;
  userName?: string;
}

export default function Paywall({ onCheckout, isLoading, userName }: PaywallProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background" role="main" aria-label="Unlock access">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl font-normal text-foreground">
            Unlock What Do I Do Now?
          </h1>
          {userName && (
            <p className="text-muted-foreground">
              Welcome, {userName}
            </p>
          )}
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Lifetime Access</CardTitle>
            <CardDescription>One-time payment, forever yours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <span className="text-4xl font-bold text-foreground">$5</span>
              <span className="text-muted-foreground ml-1">USD</span>
            </div>
            
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-foreground" />
                One task at a time focus mode
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-foreground" />
                Voice input for easy task entry
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-foreground" />
                Progress tracking and achievements
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-foreground" />
                Dark mode support
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-foreground" />
                Access from any device
              </li>
            </ul>

            <Button
              size="lg"
              className="w-full min-h-12 text-base"
              onClick={onCheckout}
              disabled={isLoading}
              data-testid="button-unlock"
            >
              {isLoading ? "Processing..." : "Unlock Now"}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-muted-foreground" data-testid="text-copyright">
            © {new Date().getFullYear()} Made by Wattlebird Media
          </p>
        </div>
      </div>
    </div>
  );
}
