import { ExpertKnowledgeForm } from "@/components/expert-knowledge/ExpertKnowledgeForm";
import { MembershipRouteGuard } from "@/components/membership/authorization";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

export default function NewExpertKnowledgePage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.creditAiExpertKnowledgeAdd}>
      <ExpertKnowledgeForm />
    </MembershipRouteGuard>
  );
}
