import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface TaskDisplayProps {
  task: string;
  onDone: () => void;
  onSkip: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function TaskDisplay({ task, onDone, onSkip }: TaskDisplayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [task]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md space-y-12 text-center">
        <div className="space-y-6">
          <p 
            className="text-xl text-muted-foreground"
            data-testid="text-do-this-now"
          >
            Do this now
          </p>
          <h1 
            className="text-4xl md:text-5xl font-medium text-foreground leading-tight break-words"
            data-testid="text-current-task"
          >
            {task}
          </h1>
          <p 
            className="text-2xl text-muted-foreground font-mono"
            data-testid="text-timer"
          >
            {formatTime(elapsedSeconds)}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onDone}
            size="lg"
            className="w-full min-h-14 text-lg"
            data-testid="button-done"
          >
            Done
          </Button>
          <Button
            onClick={onSkip}
            variant="secondary"
            size="lg"
            className="w-full min-h-14 text-lg"
            data-testid="button-skip"
          >
            Skip Task
          </Button>
        </div>
      </div>
    </div>
  );
}
