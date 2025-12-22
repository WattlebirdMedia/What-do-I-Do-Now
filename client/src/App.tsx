import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import TaskInput from "@/components/TaskInput";
import TaskDisplay from "@/components/TaskDisplay";
import CompletedTasks from "@/components/CompletedTasks";
import type { Task } from "@shared/schema";

type View = "input" | "focus" | "completed";

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function App() {
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

  const clearCompletedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/tasks/completed', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/completed'] });
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

  const handleClearCompleted = () => {
    clearCompletedMutation.mutate();
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
          text: t.text,
          completedAt: t.completedAt?.toString() || new Date().toISOString()
        }))}
        onBack={handleBackFromCompleted}
        onClear={handleClearCompleted}
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
    />
  );
}

export default App;
