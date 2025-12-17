import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Circle } from "lucide-react";

interface TaskInputProps {
  onAddTask: (task: string) => void;
  taskCount?: number;
  onStartTasks?: () => void;
}

export default function TaskInput({ onAddTask, taskCount = 0, onStartTasks }: TaskInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAddTask(trimmed);
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 md:p-8 bg-background" role="main" aria-label="Add tasks">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Circle className="w-3 h-3 text-muted-foreground fill-muted-foreground" />
          </div>
          <h1 
            className="text-2xl md:text-3xl font-normal text-foreground leading-relaxed tracking-tight"
            data-testid="text-app-title"
          >
            What Do I Do Now?
          </h1>
          <p 
            className="text-muted-foreground text-base md:text-lg"
            data-testid="text-app-subtitle"
          >
            One task at a time. No overwhelm.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full text-base md:text-lg py-6 px-4 bg-card border-card-border"
            autoFocus
            data-testid="input-task"
            aria-label="Enter a new task"
          />
          <Button
            type="submit"
            size="lg"
            className="w-full min-h-12 text-base md:text-lg"
            disabled={!inputValue.trim()}
            data-testid="button-add-task"
          >
            Add Task
          </Button>
        </form>

        {taskCount > 0 && (
          <div className="text-center space-y-4 pt-4 border-t border-border">
            <p className="text-muted-foreground text-sm" data-testid="text-task-count">
              {taskCount} {taskCount === 1 ? "task" : "tasks"} waiting
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="w-full min-h-12 text-base"
              onClick={onStartTasks}
              data-testid="button-start-tasks"
            >
              Start Working
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
