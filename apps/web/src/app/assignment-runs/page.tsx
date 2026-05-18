import { AssignmentRunsClient } from "@/components/assignment-runs-client";
import { getAssignmentRunInput } from "@/lib/server/assignment-run-service";

export const dynamic = "force-dynamic";

export default async function AssignmentRunsPage() {
  const input = await getAssignmentRunInput();

  return (
    <AssignmentRunsClient
      initialPayload={input.payload}
      initialDataSource={input.dataSource}
    />
  );
}
