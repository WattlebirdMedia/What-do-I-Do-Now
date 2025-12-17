import { Button } from "@/components/ui/button";

interface TaskDisplayProps {
  task: string;
  onDone: () => void;
}

export default function TaskDisplay({ task, onDone }: TaskDisplayProps) {
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
        </div>

        <Button
          onClick={onDone}
          size="lg"
          className="w-full min-h-14 text-lg"
          data-testid="button-done"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
