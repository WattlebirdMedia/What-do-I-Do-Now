import TaskDisplay from "../TaskDisplay";

export default function TaskDisplayExample() {
  const handleDone = () => {
    console.log("Task marked as done");
  };

  const handleSkip = () => {
    console.log("Task skipped");
  };

  return <TaskDisplay task="Reply to the important email" onDone={handleDone} onSkip={handleSkip} />;
}
