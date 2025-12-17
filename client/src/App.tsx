import { useState, useEffect } from "react";
import TaskInput from "@/components/TaskInput";
import TaskDisplay from "@/components/TaskDisplay";

const STORAGE_KEY = "whatdoidonow-tasks";

function loadTasks(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.error("Failed to load tasks from storage");
  }
  return [];
}

function saveTasks(tasks: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    console.error("Failed to save tasks to storage");
  }
}

function App() {
  const [tasks, setTasks] = useState<string[]>(loadTasks);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const handleAddTask = (task: string) => {
    setTasks((prev) => [...prev, task]);
  };

  const handleDone = () => {
    setTasks((prev) => prev.slice(1));
  };

  const handleSkip = () => {
    setTasks((prev) => {
      if (prev.length <= 1) return prev;
      const [first, ...rest] = prev;
      return [...rest, first];
    });
  };

  const currentTask = tasks[0];

  if (!currentTask) {
    return <TaskInput onAddTask={handleAddTask} />;
  }

  return <TaskDisplay task={currentTask} onDone={handleDone} onSkip={handleSkip} />;
}

export default App;
