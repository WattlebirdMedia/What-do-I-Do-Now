import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Circle, Mic, MicOff, CheckCircle, Heart } from "lucide-react";

interface TaskInputProps {
  onAddTask: (task: string) => void;
  taskCount?: number;
  onStartTasks?: () => void;
  completedCount?: number;
  onViewCompleted?: () => void;
}

function playDingSound() {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 880;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

export default function TaskInput({ onAddTask, taskCount = 0, onStartTasks, completedCount = 0, onViewCompleted }: TaskInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const result = event.results[0];
        const transcript = result[0].transcript.trim();
        
        // Show text in input field as user speaks
        setInputValue(transcript);
        
        // When final result is ready, add the task
        if (result.isFinal && transcript) {
          onAddTask(transcript);
          playDingSound();
          setInputValue("");
        }
      };
      
      recognition.onerror = () => {
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, [onAddTask]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

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
          <div className="flex gap-2">
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1 text-base md:text-lg py-6 px-4 bg-card border-card-border"
              autoFocus
              data-testid="input-task"
              aria-label="Enter a new task"
            />
            {speechSupported && (
              <Button
                type="button"
                size="icon"
                variant={isRecording ? "default" : "outline"}
                onClick={toggleRecording}
                data-testid="button-record-task"
                aria-label={isRecording ? "Stop recording" : "Record task with voice"}
                className="min-h-12 min-w-12"
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
            )}
          </div>
          {isRecording && (
            <p className="text-sm text-muted-foreground text-center" aria-live="polite">
              Listening... speak your task
            </p>
          )}
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

        {completedCount > 0 && onViewCompleted && (
          <div className="pt-4">
            <Button
              variant="ghost"
              size="lg"
              className="w-full min-h-12 text-base gap-2"
              onClick={onViewCompleted}
              data-testid="button-view-completed"
            >
              <CheckCircle className="w-4 h-4" />
              View {completedCount} completed today
            </Button>
          </div>
        )}

        <div className="pt-8 text-center">
          <a
            href="https://buymeacoffee.com/wattlebirdmedia"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="link-support"
            aria-label="Buy me a coffee"
          >
            <Heart className="w-3.5 h-3.5" />
            Buy me a coffee
          </a>
        </div>
      </div>
    </div>
  );
}
