import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskInputProps {
  onAddTask: (task: string) => void;
}

export default function TaskInput({ onAddTask }: TaskInputProps) {
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
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <h1 
            className="text-2xl font-medium text-foreground leading-relaxed"
            data-testid="text-app-title"
          >
            What do you need to do?
          </h1>
          <p 
            className="text-muted-foreground text-lg"
            data-testid="text-app-subtitle"
          >
            Add a task to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter a task..."
            className="w-full text-lg py-6 px-4"
            autoFocus
            data-testid="input-task"
          />
          <Button
            type="submit"
            size="lg"
            className="w-full min-h-14 text-lg"
            disabled={!inputValue.trim()}
            data-testid="button-add-task"
          >
            Add Task
          </Button>
        </form>
      </div>
    </div>
  );
}
