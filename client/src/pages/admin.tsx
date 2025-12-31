import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Check, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface PendingUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  paymentPending: string;
  reference: string;
  plan: string;
  amount: string;
}

export default function AdminPage() {
  const { data: pendingUsers = [], isLoading, error } = useQuery<PendingUser[]>({
    queryKey: ['/api/admin/pending-payments'],
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', `/api/admin/approve-payment/${userId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-payments'] });
    }
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
        <div className="text-destructive">Not authorized to view this page</div>
        <Link href="/">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to app
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button size="icon" variant="ghost" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-normal">Payment Approvals</h1>
          </div>
          <ThemeToggle />
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : pendingUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No pending payments</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <Card key={user.id} data-testid={`card-pending-${user.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    {user.firstName} {user.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{user.amount}</span>
                    <span className="text-muted-foreground">({user.plan})</span>
                  </div>
                  <p className="text-sm">
                    Reference: <code className="bg-muted px-2 py-1 rounded">{user.reference}</code>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pending since: {new Date(user.paymentPending).toLocaleDateString()}
                  </p>
                  <Button
                    onClick={() => approveMutation.mutate(user.id)}
                    disabled={approveMutation.isPending}
                    className="mt-2"
                    data-testid={`button-approve-${user.id}`}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve Payment
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
