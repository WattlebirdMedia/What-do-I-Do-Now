import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Star } from "lucide-react";

interface CompletedTask {
  text: string;
  completedAt: string;
}

interface CompletedTasksProps {
  tasks: CompletedTask[];
  onBack: () => void;
  onClear: () => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CompletedTasks({ tasks, onBack, onClear }: CompletedTasksProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background" role="main" aria-label="Completed tasks">
      <header className="flex items-center justify-between p-4 md:p-6 border-b border-border">
        <Button
          size="icon"
          variant="ghost"
          onClick={onBack}
          data-testid="button-back"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-medium text-foreground">Today's Progress</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 p-6 md:p-8">
        <div className="w-full max-w-md mx-auto space-y-6">
          {tasks.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-muted-foreground text-lg">
                No tasks completed yet today.
              </p>
              <p className="text-muted-foreground">
                Complete some tasks and come back to see your progress.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-3 py-6">
                <div className="flex justify-center">
                  <Star className="w-8 h-8 text-foreground" />
                </div>
                <h2 className="text-2xl md:text-3xl font-normal text-foreground">
                  I did it
                </h2>
                <p className="text-muted-foreground text-lg">
                  You completed {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} today.
                </p>
              </div>

              <ul className="space-y-3" aria-label="List of completed tasks">
                {tasks.map((task, index) => (
                  <li 
                    key={index}
                    className="flex items-start gap-3 p-4 bg-card rounded-md border border-card-border"
                    data-testid={`completed-task-${index}`}
                  >
                    <div className="flex-1">
                      <p className="text-foreground">{task.text}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Completed at {formatTime(task.completedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>

      {tasks.length > 0 && (
        <footer className="p-4 md:p-6 border-t border-border">
          <div className="w-full max-w-md mx-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full min-h-12 text-base gap-2"
              onClick={onClear}
              data-testid="button-clear-completed"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
