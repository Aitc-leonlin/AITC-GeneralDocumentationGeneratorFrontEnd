import Image from "next/image";

import { ChatWindow } from "@/components/ChatWindow";
import { GuideInfoBox } from "@/components/guide/GuideInfoBox";
import { MembershipRouteGuard } from "@/components/membership/authorization";
import MembershipSessionGuard from "@/components/membership/MembershipSessionGuard";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { BACKEND_API_PATHS } from "@/utils/api";

export default function ChatbotPage() {
  const InfoCard = (
    <GuideInfoBox>
      <div className="mb-4 flex justify-center">
       
      </div>
      <ul>
        <li className="hidden text-l md:block">
          <span className="ml-2">
            右上角可建立新對話、複製整段內容，也可透過
            <code>歷史對話紀錄</code> 切換過往對話。
          </span>
        </li>
        <li>
          <span className="ml-2">
            每則助理回答都可單獨複製，也可複製整段對話。
          </span>
        </li>
        <li className="text-l">
          <span className="ml-2">
            問題範例：<code>請分析這家公司授信風險</code>
          </span>
        </li>
      </ul>
    </GuideInfoBox>
  );

  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.creditAiChat}>
      <MembershipSessionGuard>
        <ChatWindow
          endpoint={BACKEND_API_PATHS.chat}
          emoji="AI"
          placeholder="請輸入授信調查問題"
          showIngestForm
          emptyStateComponent={InfoCard}
          presetQuestions={[
            "現金水位是否充足？",
            "是否有短債壓力？",
            "近三期營收與獲利趨勢是否惡化？",
          ]}
        />
      </MembershipSessionGuard>
    </MembershipRouteGuard>
  );
}
