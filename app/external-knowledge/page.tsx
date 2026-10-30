import { WarehouseDataManager } from "@/components/external-knowledge/WarehouseDataManager";
import { MembershipRouteGuard } from "@/components/membership/authorization";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

export default function WarehouseDataPage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.creditAiWarehouseDataView}>
      <WarehouseDataManager />
    </MembershipRouteGuard>
  );
}
