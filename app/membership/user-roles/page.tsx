import { MembershipRouteGuard } from "@/components/membership/authorization";
import UserRoleManagement from "@/components/membership/UserRoleManagement";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

export default function MembershipUserRolesPage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.membershipUserRoles}>
      <UserRoleManagement />
    </MembershipRouteGuard>
  );
}
