import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import TaskInput from "@/components/TaskInput";
import TaskDisplay from "@/components/TaskDisplay";
import CompletedTasks from "@/components/CompletedTasks";
import Paywall from "@/components/Paywall";
import { Button } from "@/components/ui/button";
import type { Task } from "@shared/schema";

type View = "input" | "focus" | "completed";

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="w-full max-w-md text-center space-y-8">
        <h1 className="text-3xl md:text-4xl font-normal text-foreground">
          What Do I Do Now?
        </h1>
        <p className="text-lg text-muted-foreground">
          A calm task manager that shows you one thing at a time.
        </p>
        <p className="text-muted-foreground">
          Sign in to save your tasks and access them from any device.
        </p>
        <Button
          size="lg"
          className="w-full min-h-12 text-base"
          onClick={() => window.location.href = '/api/login'}
          data-testid="button-login"
        >
          Sign In to Get Started
        </Button>
        <div className="pt-8">
          <p className="text-xs text-muted-foreground" data-testid="text-copyright">
            © {new Date().getFullYear()} Made by Wattlebird Media
          </p>
        </div>
      </div>
    </div>
  );
}

function TaskApp() {
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

  if (view === "completed") {
    return (
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
    );
  }

  if (view === "input" || !currentTask) {
    return (
      <TaskInput 
        onAddTask={handleAddTask} 
        taskCount={tasks.length}
        onStartTasks={handleStartTasks}
        completedCount={todayCompleted.length}
        onViewCompleted={handleViewCompleted}
        onLogout={logout}
        userName={user?.firstName || user?.email || undefined}
      />
    );
  }

  return (
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
  );
}

interface BillingStatus {
  hasPaid: boolean;
  paidAt: string | null;
}

function App() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  const { data: billingStatus, isLoading: billingLoading } = useQuery<BillingStatus>({
    queryKey: ['/api/billing/status'],
    enabled: isAuthenticated,
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/billing/checkout', {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/billing/confirm', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/status'] });
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success' && isAuthenticated) {
      confirmPaymentMutation.mutate();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isAuthenticated]);

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

  if (!billingStatus?.hasPaid) {
    return (
      <Paywall 
        onCheckout={() => checkoutMutation.mutate()}
        isLoading={checkoutMutation.isPending}
        userName={user?.firstName || user?.email || undefined}
      />
    );
  }

  return <TaskApp />;
}

export default App;
