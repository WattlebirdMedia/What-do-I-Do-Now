import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Plus, Timer, TimerOff } from "lucide-react";

interface TaskDisplayProps {
  task: string;
  onDone: () => void;
  onSkip: () => void;
  taskPosition?: number;
  totalTasks?: number;
  onAddMore?: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function TaskDisplay({ 
  task, 
  onDone, 
  onSkip, 
  taskPosition = 1, 
  totalTasks = 1,
  onAddMore 
}: TaskDisplayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(() => {
    const saved = localStorage.getItem("timerEnabled");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("timerEnabled", JSON.stringify(timerEnabled));
  }, [timerEnabled]);

  useEffect(() => {
    if (!timerEnabled) return;
    
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [task, timerEnabled]);

  return (
    <div className="flex flex-col min-h-screen bg-background" role="main" aria-label="Current task view">
      <header className="flex items-center justify-between p-4 md:p-6">
        <div className="text-sm text-muted-foreground" data-testid="text-position">
          {taskPosition} of {totalTasks}
        </div>
        <div className="flex items-center gap-2">
          {timerEnabled && (
            <div 
              className="text-xl md:text-2xl font-sans tabular-nums tracking-wide text-foreground"
              data-testid="text-timer"
              role="timer"
              aria-live="polite"
              aria-label={`Time elapsed: ${Math.floor(elapsedSeconds / 60)} minutes and ${elapsedSeconds % 60} seconds`}
            >
              {formatTime(elapsedSeconds)}
            </div>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTimerEnabled(!timerEnabled)}
            data-testid="button-toggle-timer"
            aria-label={timerEnabled ? "Hide timer" : "Show timer"}
          >
            {timerEnabled ? <Timer className="w-5 h-5" /> : <TimerOff className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-sm text-center space-y-8">
          <div className="space-y-4">
            <p 
              className="text-base md:text-lg text-muted-foreground uppercase tracking-widest"
              data-testid="text-do-this-now"
              aria-hidden="true"
            >
              Do this now
            </p>
            <h1 
              className="text-3xl md:text-4xl font-normal text-foreground leading-snug break-words"
              data-testid="text-current-task"
              aria-label={`Current task: ${task}`}
            >
              {task}
            </h1>
          </div>
        </div>
      </main>

      <footer className="p-4 md:p-6 space-y-3">
        <div className="w-full max-w-sm mx-auto space-y-3">
          <Button
            onClick={onDone}
            size="lg"
            className="w-full min-h-14 text-base md:text-lg gap-2"
            data-testid="button-done"
          >
            <Check className="w-5 h-5" />
            Done
          </Button>
          <div className="flex gap-3">
            <Button
              onClick={onSkip}
              variant="secondary"
              size="lg"
              className="flex-1 min-h-12 text-base gap-2"
              data-testid="button-skip"
            >
              <ArrowRight className="w-4 h-4" />
              Skip
            </Button>
            {onAddMore && (
              <Button
                onClick={onAddMore}
                variant="secondary"
                size="lg"
                className="flex-1 min-h-12 text-base gap-2"
                data-testid="button-add-more"
              >
                <Plus className="w-4 h-4" />
                Add More
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
