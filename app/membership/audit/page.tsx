import { MembershipRouteGuard } from "@/components/membership/authorization";
import AuditLogManagement from "@/components/membership/AuditLogManagement";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

export default function MembershipAuditPage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.auditView}>
      <AuditLogManagement />
    </MembershipRouteGuard>
  );
}
