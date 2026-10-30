import { MembershipRouteGuard } from "@/components/membership/authorization";
import RoleManagement from "@/components/membership/RoleManagement";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

export default function MembershipRolesPage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.rbacView}>
      <RoleManagement />
    </MembershipRouteGuard>
  );
}
