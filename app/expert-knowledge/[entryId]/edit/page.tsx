"use client";

import { useParams } from "next/navigation";

import { ExpertKnowledgeForm } from "@/components/expert-knowledge/ExpertKnowledgeForm";
import { MembershipRouteGuard } from "@/components/membership/authorization";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

export default function EditExpertKnowledgePage() {
  const params = useParams<{ entryId: string }>();

  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.creditAiExpertKnowledgeEdit}>
      <ExpertKnowledgeForm entryId={params.entryId} />
    </MembershipRouteGuard>
  );
}
