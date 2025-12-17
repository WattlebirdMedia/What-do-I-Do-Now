import TaskInput from "../TaskInput";

export default function TaskInputExample() {
  const handleAddTask = (task: string) => {
    console.log("Task added:", task);
  };

  return <TaskInput onAddTask={handleAddTask} />;
}
