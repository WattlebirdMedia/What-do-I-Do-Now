import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Switch, Route, useLocation } from "wouter";
import TaskInput from "@/components/TaskInput";
import TaskDisplay from "@/components/TaskDisplay";
import CompletedTasks from "@/components/CompletedTasks";
import Paywall from "@/components/Paywall";
import AdminPage from "@/pages/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Check, Brain, Focus, Sparkles } from "lucide-react";
import type { Task } from "@shared/schema";

type View = "input" | "focus" | "completed";

function TrialBanner({ daysRemaining, onClick }: { daysRemaining: number; onClick?: () => void }) {
  return (
    <div 
      className="fixed top-0 left-0 right-0 bg-primary text-primary-foreground py-2 px-4 text-center text-sm z-50 cursor-pointer hover:bg-primary/90 transition-colors" 
      data-testid="banner-trial"
      onClick={onClick}
    >
      <div className="flex items-center justify-center gap-2">
        <Clock className="w-4 h-4" />
        <span>
          {daysRemaining === 1 
            ? "Trial ends tomorrow - Click to subscribe" 
            : `${daysRemaining} days left in your free trial - Click to subscribe`}
        </span>
      </div>
    </div>
  );
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function LandingPage() {
  const benefits = [
    {
      icon: Focus,
      title: "One Task at a Time",
      description: "No overwhelming lists. Just your next action, front and center."
    },
    {
      icon: Brain,
      title: "Built for ADHD Minds",
      description: "Designed to reduce decision fatigue and analysis paralysis."
    },
    {
      icon: Sparkles,
      title: "Calm, Not Chaotic",
      description: "A peaceful interface that won't add to your mental load."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-lg space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-medium text-foreground" data-testid="text-title">
              Grounded
            </h1>
            <p className="text-xl text-muted-foreground" data-testid="text-tagline">
              The task manager that actually helps you focus.
            </p>
          </div>

          <div className="bg-accent/30 rounded-md p-6 text-center space-y-2">
            <p className="text-lg text-foreground">
              Stop staring at your to-do list wondering where to start.
            </p>
            <p className="text-muted-foreground">
              This app shows you just one task at a time, so you always know exactly what to do next.
            </p>
          </div>

          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className="flex items-start gap-4 p-4"
                data-testid={`benefit-${index}`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-foreground">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full min-h-14 text-lg"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Start Your Free 7-Day Trial
            </Button>
            <p className="text-center text-sm text-muted-foreground" data-testid="text-pricing">
              Then just $6.69/month or $53.53/year
            </p>
          </div>

          <div className="pt-4 space-y-4">
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Check className="w-4 h-4" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-4 h-4" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-center text-xs text-muted-foreground" data-testid="text-copyright">
              © {new Date().getFullYear()} Made by Wattlebird Media
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskApp({ trialDaysRemaining, onShowPayment }: { trialDaysRemaining?: number; onShowPayment?: () => void }) {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>("input");

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  const { data: completedTasks = [], isLoading: completedLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks/completed'],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/tasks', { text });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('PATCH', `/api/tasks/${id}/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/completed'] });
    }
  });

  const reorderTasksMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const response = await apiRequest('POST', '/api/tasks/reorder', { taskIds });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }
  });

  const { data: binTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks/bin'],
  });

  const archiveCompletedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/tasks/archive', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/bin'] });
    }
  });

  const restoreTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('PATCH', `/api/tasks/${id}/restore`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/bin'] });
    }
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/tasks/${id}/permanent`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/bin'] });
    }
  });

  const emptyBinMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/tasks/bin', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/bin'] });
    }
  });

  const handleAddTask = (task: string) => {
    createTaskMutation.mutate(task);
  };

  const handleDone = () => {
    const currentTask = tasks[0];
    if (currentTask) {
      completeTaskMutation.mutate(currentTask.id, {
        onSuccess: () => {
          if (tasks.length <= 1) {
            setView("input");
          }
        }
      });
    }
  };

  const handleSkip = () => {
    if (tasks.length <= 1) return;
    const [first, ...rest] = tasks;
    const newOrder = [...rest, first];
    reorderTasksMutation.mutate(newOrder.map(t => t.id));
  };

  const handleStartTasks = () => {
    if (tasks.length > 0) {
      setView("focus");
    }
  };

  const handleAddMore = () => {
    setView("input");
  };

  const handleViewCompleted = () => {
    setView("completed");
  };

  const handleBackFromCompleted = () => {
    setView(tasks.length > 0 ? "focus" : "input");
  };

  const handleMoveTobin = () => {
    archiveCompletedMutation.mutate();
  };

  const handleRestoreTask = (id: string) => {
    restoreTaskMutation.mutate(id);
  };

  const handlePermanentDelete = (id: string) => {
    permanentDeleteMutation.mutate(id);
  };

  const handleEmptyBin = () => {
    emptyBinMutation.mutate();
  };

  const todayCompleted = completedTasks.filter(
    (t) => t.completedAt && t.completedAt.toString().split('T')[0] === getTodayDateString()
  );

  const currentTask = tasks[0];

  if (tasksLoading || completedLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const showTrialBanner = trialDaysRemaining !== undefined && trialDaysRemaining > 0;

  if (view === "completed") {
    return (
      <>
        {showTrialBanner && <TrialBanner daysRemaining={trialDaysRemaining} onClick={onShowPayment} />}
        <div className={showTrialBanner ? "pt-10" : ""}>
          <CompletedTasks
            tasks={todayCompleted.map(t => ({
              id: t.id,
              text: t.text,
              completedAt: t.completedAt?.toString() || new Date().toISOString()
            }))}
            binTasks={binTasks.map(t => ({
              id: t.id,
              text: t.text,
              archivedAt: t.archivedAt?.toString() || new Date().toISOString()
            }))}
            onBack={handleBackFromCompleted}
            onMoveToBin={handleMoveTobin}
            onRestoreTask={handleRestoreTask}
            onPermanentDelete={handlePermanentDelete}
            onEmptyBin={handleEmptyBin}
            onLogout={logout}
            userName={user?.firstName || user?.email || undefined}
          />
        </div>
      </>
    );
  }

  if (view === "input" || !currentTask) {
    return (
      <>
        {showTrialBanner && <TrialBanner daysRemaining={trialDaysRemaining} onClick={onShowPayment} />}
        <div className={showTrialBanner ? "pt-10" : ""}>
          <TaskInput 
            onAddTask={handleAddTask} 
            taskCount={tasks.length}
            onStartTasks={handleStartTasks}
            completedCount={todayCompleted.length}
            onViewCompleted={handleViewCompleted}
            onLogout={logout}
            userName={user?.firstName || user?.email || undefined}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {showTrialBanner && <TrialBanner daysRemaining={trialDaysRemaining} onClick={onShowPayment} />}
      <div className={showTrialBanner ? "pt-10" : ""}>
        <TaskDisplay 
          task={currentTask.text} 
          onDone={handleDone} 
          onSkip={handleSkip}
          taskPosition={1}
          totalTasks={tasks.length}
          onAddMore={handleAddMore}
          completedCount={todayCompleted.length}
          onViewCompleted={handleViewCompleted}
          onLogout={logout}
          userName={user?.firstName || user?.email || undefined}
        />
      </div>
    </>
  );
}

interface BillingStatus {
  hasPaid: boolean;
  paymentPending: boolean;
  paidAt: string | null;
  inTrial: boolean;
  trialDaysRemaining: number;
  trialExpired: boolean;
}

interface PayIdInfo {
  payId: string;
  monthlyPrice: string;
  yearlyPrice: string;
  reference: string;
}

function App() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [showPaymentFromTrial, setShowPaymentFromTrial] = useState(false);
  
  const { data: billingStatus, isLoading: billingLoading } = useQuery<BillingStatus>({
    queryKey: ['/api/billing/status'],
    enabled: isAuthenticated,
  });

  const { data: payIdInfo } = useQuery<PayIdInfo>({
    queryKey: ['/api/billing/payid'],
    enabled: isAuthenticated && (!billingStatus?.hasPaid || showPaymentFromTrial),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (plan: 'monthly' | 'yearly') => {
      const response = await apiRequest('POST', '/api/billing/mark-paid', { plan });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/status'] });
      setShowPaymentFromTrial(false);
    }
  });

  if (isLoading || (isAuthenticated && billingLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  if (location.startsWith('/admin')) {
    return <AdminPage />;
  }

  if (showPaymentFromTrial && billingStatus?.inTrial) {
    return (
      <Paywall 
        payId={payIdInfo?.payId || ''}
        monthlyPrice={payIdInfo?.monthlyPrice || '$6.69 USD'}
        yearlyPrice={payIdInfo?.yearlyPrice || '$53.53 USD'}
        reference={payIdInfo?.reference || ''}
        paymentPending={billingStatus?.paymentPending || false}
        onMarkPaid={(plan) => markPaidMutation.mutate(plan)}
        isLoading={markPaidMutation.isPending}
        userName={user?.firstName || user?.email || undefined}
        trialDaysRemaining={billingStatus.trialDaysRemaining}
        onBack={() => setShowPaymentFromTrial(false)}
      />
    );
  }

  if (!billingStatus?.hasPaid && !billingStatus?.inTrial) {
    return (
      <Paywall 
        payId={payIdInfo?.payId || ''}
        monthlyPrice={payIdInfo?.monthlyPrice || '$6.69 USD'}
        yearlyPrice={payIdInfo?.yearlyPrice || '$53.53 USD'}
        reference={payIdInfo?.reference || ''}
        paymentPending={billingStatus?.paymentPending || false}
        onMarkPaid={(plan) => markPaidMutation.mutate(plan)}
        isLoading={markPaidMutation.isPending}
        userName={user?.firstName || user?.email || undefined}
      />
    );
  }

  return (
    <TaskApp 
      trialDaysRemaining={billingStatus?.inTrial ? billingStatus.trialDaysRemaining : undefined} 
      onShowPayment={() => setShowPaymentFromTrial(true)}
    />
  );
}

export default App;
