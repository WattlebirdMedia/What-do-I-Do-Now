import { useState } from "react";
import TaskInput from "@/components/TaskInput";
import TaskDisplay from "@/components/TaskDisplay";

function App() {
  const [tasks, setTasks] = useState<string[]>([]);

  const handleAddTask = (task: string) => {
    setTasks((prev) => [...prev, task]);
  };

  const handleDone = () => {
    setTasks((prev) => prev.slice(1));
  };

  const currentTask = tasks[0];

  if (!currentTask) {
    return <TaskInput onAddTask={handleAddTask} />;
  }

  return <TaskDisplay task={currentTask} onDone={handleDone} />;
}

export default App;
