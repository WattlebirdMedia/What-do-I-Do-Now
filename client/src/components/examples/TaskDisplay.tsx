import TaskDisplay from "../TaskDisplay";

export default function TaskDisplayExample() {
  const handleDone = () => {
    console.log("Task marked as done");
  };

  return <TaskDisplay task="Reply to the important email" onDone={handleDone} />;
}
