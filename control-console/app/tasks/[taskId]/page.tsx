import { TaskDetail } from "@components/dashboard/TaskDetail";

export default async function TaskPage(
  props: PageProps<"/tasks/[taskId]">
) {
  const { taskId } = await props.params;
  return <TaskDetail taskId={taskId} />;
}

