import { MembershipRouteGuard } from "@/components/membership/authorization";
import PermissionManagement from "@/components/membership/PermissionManagement";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

export default function MembershipPermissionsPage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.rbacView}>
      <PermissionManagement />
    </MembershipRouteGuard>
  );
}
