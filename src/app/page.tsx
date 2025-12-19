import { Dashboard } from "@/components/Dashboard";
import { TaskList } from "@/components/TaskList";
import { TaskProvider } from "@/context/TaskContext";

export default function Home() {
  return (
    <TaskProvider>
      <div className="container mx-auto max-w-5xl">
        <Dashboard />
      </div>
    </TaskProvider>
  );
}
