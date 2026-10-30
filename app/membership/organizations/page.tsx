import { MembershipRouteGuard } from "@/components/membership/authorization";
import OrganizationPermissionManagement from "@/components/membership/OrganizationPermissionManagement";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

export default function MembershipOrganizationsPage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.organizationScopeView}>
      <OrganizationPermissionManagement />
    </MembershipRouteGuard>
  );
}
