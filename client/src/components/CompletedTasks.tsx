import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Star, Zap, Flame, Trophy, Crown, RotateCcw, Archive } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface CompletedTask {
  id: string;
  text: string;
  completedAt: string;
}

interface BinTask {
  id: string;
  text: string;
  archivedAt: string;
}

interface CompletedTasksProps {
  tasks: CompletedTask[];
  binTasks: BinTask[];
  onBack: () => void;
  onMoveToBin: () => void;
  onRestoreTask: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyBin: () => void;
  onLogout?: () => void;
  userName?: string;
}

interface AchievementBadge {
  threshold: number;
  label: string;
  icon: typeof Zap;
  unlocked: boolean;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getAchievements(taskCount: number): AchievementBadge[] {
  return [
    { threshold: 3, label: "Starter", icon: Zap, unlocked: taskCount >= 3 },
    { threshold: 6, label: "Focused", icon: Flame, unlocked: taskCount >= 6 },
    { threshold: 9, label: "Achiever", icon: Trophy, unlocked: taskCount >= 9 },
    { threshold: 12, label: "Champion", icon: Crown, unlocked: taskCount >= 12 },
  ];
}

const encouragingPhrases = [
  "I did it",
  "I followed through",
  "I completed this",
  "I showed up for this"
];

function getRandomPhrase(): string {
  const index = Math.floor(Math.random() * encouragingPhrases.length);
  return encouragingPhrases[index];
}

type TabType = "completed" | "bin";

export default function CompletedTasks({ 
  tasks, 
  binTasks, 
  onBack, 
  onMoveToBin, 
  onRestoreTask, 
  onPermanentDelete, 
  onEmptyBin 
}: CompletedTasksProps) {
  const [activeTab, setActiveTab] = useState<TabType>("completed");
  const [showAchievements, setShowAchievements] = useState(true);
  const phrase = getRandomPhrase();
  const achievements = getAchievements(tasks.length);
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  
  return (
    <div className="flex flex-col min-h-screen bg-background" role="main" aria-label="Completed tasks">
      <header className="flex items-center justify-between gap-2 p-4 md:p-6 border-b border-border">
        <Button
          size="icon"
          variant="ghost"
          onClick={onBack}
          data-testid="button-back"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-medium text-foreground">
          {activeTab === "completed" ? "Today's Progress" : "Bin"}
        </h1>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowAchievements(!showAchievements)}
            data-testid="button-toggle-achievements"
            aria-label={showAchievements ? "Hide achievements" : "Show achievements"}
            className={`toggle-elevate ${showAchievements ? 'toggle-elevated' : ''}`}
          >
            <Trophy className="w-5 h-5" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("completed")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "completed" 
              ? "text-foreground border-b-2 border-foreground" 
              : "text-muted-foreground"
          }`}
          data-testid="tab-completed"
        >
          Completed ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab("bin")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "bin" 
              ? "text-foreground border-b-2 border-foreground" 
              : "text-muted-foreground"
          }`}
          data-testid="tab-bin"
        >
          Bin ({binTasks.length})
        </button>
      </div>

      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="w-full max-w-md mx-auto space-y-6">
          {activeTab === "completed" ? (
            <>
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
                      {phrase}
                    </h2>
                    <p className="text-muted-foreground text-lg">
                      You completed {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} today.
                    </p>
                  </div>

                  {showAchievements && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground text-center">
                        Achievements {unlockedCount > 0 && `(${unlockedCount}/${achievements.length})`}
                      </h3>
                      <div className="flex justify-center flex-wrap gap-2">
                        {achievements.map((achievement) => {
                          const Icon = achievement.icon;
                          return (
                            <Badge
                              key={achievement.threshold}
                              variant={achievement.unlocked ? "default" : "secondary"}
                              className={`gap-1.5 px-3 py-1.5 ${!achievement.unlocked ? 'opacity-40' : ''}`}
                              data-testid={`badge-achievement-${achievement.threshold}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{achievement.label}</span>
                              <span className="text-xs opacity-70">({achievement.threshold})</span>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <ul className="space-y-3" aria-label="List of completed tasks">
                    {tasks.map((task, index) => (
                      <li 
                        key={task.id}
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
            </>
          ) : (
            <>
              {binTasks.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <Archive className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground text-lg">
                    Bin is empty
                  </p>
                  <p className="text-muted-foreground">
                    Cleared tasks will appear here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3" aria-label="List of archived tasks">
                  {binTasks.map((task, index) => (
                    <li 
                      key={task.id}
                      className="flex items-start gap-3 p-4 bg-card rounded-md border border-card-border"
                      data-testid={`bin-task-${index}`}
                    >
                      <div className="flex-1">
                        <p className="text-foreground">{task.text}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Archived at {formatTime(task.archivedAt)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onRestoreTask(task.id)}
                          data-testid={`button-restore-${index}`}
                          aria-label="Restore task"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onPermanentDelete(task.id)}
                          data-testid={`button-delete-${index}`}
                          aria-label="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </main>

      {activeTab === "completed" && tasks.length > 0 && (
        <footer className="p-4 md:p-6 border-t border-border">
          <div className="w-full max-w-md mx-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full min-h-12 text-base gap-2"
              onClick={onMoveToBin}
              data-testid="button-move-to-bin"
            >
              <Archive className="w-4 h-4" />
              Move to Bin
            </Button>
          </div>
        </footer>
      )}

      {activeTab === "bin" && binTasks.length > 0 && (
        <footer className="p-4 md:p-6 border-t border-border">
          <div className="w-full max-w-md mx-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full min-h-12 text-base gap-2"
              onClick={onEmptyBin}
              data-testid="button-empty-bin"
            >
              <Trash2 className="w-4 h-4" />
              Empty Bin
            </Button>
          </div>
        </footer>
      )}

      <div className="p-4 text-center">
        <p className="text-xs text-muted-foreground" data-testid="text-copyright">
          © {new Date().getFullYear()} Made by Wattlebird Media
        </p>
      </div>
    </div>
  );
}
