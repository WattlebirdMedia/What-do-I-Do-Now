import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Copy, Clock, Lock, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface PaywallProps {
  payId: string;
  monthlyPrice: string;
  yearlyPrice: string;
  reference: string;
  paymentPending: boolean;
  onMarkPaid: (plan: 'monthly' | 'yearly') => void;
  isLoading: boolean;
  userName?: string;
  trialDaysRemaining?: number;
  onBack?: () => void;
}

export default function Paywall({ 
  payId, 
  monthlyPrice,
  yearlyPrice,
  reference, 
  paymentPending, 
  onMarkPaid, 
  isLoading, 
  userName,
  trialDaysRemaining,
  onBack
}: PaywallProps) {
  const [copied, setCopied] = useState<'payid' | 'ref' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const copyToClipboard = async (text: string, type: 'payid' | 'ref') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const currentPrice = selectedPlan === 'monthly' ? monthlyPrice : yearlyPrice;

  if (paymentPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background" role="main">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-normal text-foreground">
              Payment Pending
            </h1>
            {userName && (
              <p className="text-muted-foreground">
                Thanks, {userName}
              </p>
            )}
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-center text-muted-foreground">
                We've received your payment notification. Once we verify your transfer, you'll have full access to the app.
              </p>
              <p className="text-center text-sm text-muted-foreground">
                This usually takes less than 24 hours.
              </p>
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background" role="main" aria-label="Unlock access">
      {onBack && (
        <div className="absolute top-4 left-4">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      )}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl font-normal text-foreground">
            {trialDaysRemaining ? "Subscribe Now" : "Unlock What Do I Do Now?"}
          </h1>
          {trialDaysRemaining && (
            <p className="text-muted-foreground">
              {trialDaysRemaining === 1 
                ? "Your trial ends tomorrow" 
                : `${trialDaysRemaining} days left in your free trial`}
            </p>
          )}
          {userName && !trialDaysRemaining && (
            <p className="text-muted-foreground">
              Welcome, {userName}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`p-4 rounded-md border text-center transition-colors ${
              selectedPlan === 'monthly' 
                ? 'border-foreground bg-muted' 
                : 'border-border hover-elevate'
            }`}
            data-testid="button-plan-monthly"
          >
            <div className="text-lg font-semibold">{monthlyPrice}</div>
            <div className="text-sm text-muted-foreground">per month</div>
          </button>
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`p-4 rounded-md border text-center transition-colors relative ${
              selectedPlan === 'yearly' 
                ? 'border-foreground bg-muted' 
                : 'border-border hover-elevate'
            }`}
            data-testid="button-plan-yearly"
          >
            <div className="text-lg font-semibold">{yearlyPrice}</div>
            <div className="text-sm text-muted-foreground">per year</div>
            <div className="absolute -top-2 right-2 text-xs bg-foreground text-background px-2 py-0.5 rounded">
              Save 33%
            </div>
          </button>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Pay via PayID</CardTitle>
            <CardDescription>Australian bank transfer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">PayID:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono" data-testid="text-payid">
                    {payId}
                  </code>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => copyToClipboard(payId, 'payid')}
                    data-testid="button-copy-payid"
                  >
                    {copied === 'payid' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Amount:</p>
                <div className="bg-muted px-3 py-2 rounded-md text-sm font-semibold" data-testid="text-amount">
                  {currentPrice}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Reference:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono" data-testid="text-reference">
                    {reference}
                  </code>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => copyToClipboard(reference, 'ref')}
                    data-testid="button-copy-reference"
                  >
                    {copied === 'ref' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2 text-sm text-muted-foreground">
              <p>1. Open your banking app</p>
              <p>2. Send {currentPrice} to the PayID above</p>
              <p>3. Use the reference code provided</p>
              <p>4. Click the button below once sent</p>
            </div>

            <Button
              size="lg"
              className="w-full min-h-12 text-base"
              onClick={() => onMarkPaid(selectedPlan)}
              disabled={isLoading}
              data-testid="button-ive-paid"
            >
              {isLoading ? "Processing..." : "I've Made the Payment"}
            </Button>
          </CardContent>
        </Card>

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
        </ul>

        <div className="text-center">
          <p className="text-xs text-muted-foreground" data-testid="text-copyright">
            © {new Date().getFullYear()} Made by Wattlebird Media
          </p>
        </div>
      </div>
    </div>
  );
}
