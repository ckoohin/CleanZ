import { TaskerRegistrationWizard } from "@/features/tasker/_components/TaskerRegistrationWizard";

export default function TaskerOnboardingPage() {
  return (
    <div className="w-full min-h-screen bg-slate-50/50 dark:bg-transparent">
      <TaskerRegistrationWizard />
    </div>
  );
}
