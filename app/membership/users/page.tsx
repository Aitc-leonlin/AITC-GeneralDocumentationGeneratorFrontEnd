import { MembershipRouteGuard } from "@/components/membership/authorization";
import UserManagement from "@/components/membership/UserManagement";

export default function MembershipUsersPage() {
  return (
    <MembershipRouteGuard permission="membership.read">
      <UserManagement />
    </MembershipRouteGuard>
  );
}
