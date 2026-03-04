import { WorkflowsList } from "./WorkflowsList";
import { ResponsiblesList } from "./ResponsiblesList";

export function WorkflowManager() {
  return (
    <div className="space-y-6">
      <WorkflowsList />
      <ResponsiblesList />
    </div>
  );
}
