import { MembershipRouteGuard } from "@/components/membership/authorization";
import NotificationManagement from "@/components/membership/NotificationManagement";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

export default function MembershipNotificationsPage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.notificationView}>
      <NotificationManagement />
    </MembershipRouteGuard>
  );
}
