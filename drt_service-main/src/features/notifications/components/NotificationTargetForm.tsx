"use client";

import type {
  NotificationSendFormState,
  NotificationTargetType,
} from "@/types/notificationSend";
import { CustomSelect, CustomOption } from "@/components/ui/CustomSelect";

interface NotificationTargetFormProps {
  formData: NotificationSendFormState;
  onChange: (field: keyof NotificationSendFormState, value: string) => void;
}

export default function NotificationTargetForm({
  formData,
  onChange,
}: NotificationTargetFormProps) {
  const isUserDisabled = formData.targetType !== "SPECIFIC_USER";

  return (
    <div className="rounded-xl border border-gray-200 bg-[#FAFAFA] p-5">
      <h2 className="mb-4 text-sm font-bold text-[#222222]">발송 기본 설정</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#222222]">
            알림 유형 <span className="text-red-500">*</span>
          </label>
          <CustomSelect
            value={formData.notificationType}
            onChange={(val) => onChange("notificationType", val)}
          >
            <CustomOption value="NOTICE">일반 공지</CustomOption>
            <CustomOption value="DELAY_CANCEL">지연 / 결항 안내</CustomOption>
            <CustomOption value="URGENT">사고 / 긴급 재난</CustomOption>
            <CustomOption value="ROUTE_CHANGE">노선 우회 안내</CustomOption>
          </CustomSelect>
        </div>

        {/* 알림 대상 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#222222]">
            알림 대상 <span className="text-red-500">*</span>
          </label>
          <CustomSelect
            value={formData.targetType}
            onChange={(val) => {
              onChange("targetType", val);
              if (val !== "SPECIFIC_USER") {
                onChange("targetUserId", "");
              }
            }}
          >
            <CustomOption value="ALL_PASSENGER">승객 전체</CustomOption>
            <CustomOption value="ALL_DRIVER">기사 전체</CustomOption>
            <CustomOption value="SPECIFIC_USER">특정 사용자</CustomOption>
          </CustomSelect>
        </div>

        {/* 수신 사용자 ID */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#222222]">
            수신 사용자 ID {!isUserDisabled && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={formData.targetUserId}
            disabled={isUserDisabled}
            onChange={(e) => onChange("targetUserId", e.target.value)}
            placeholder={
              isUserDisabled ? "특정 사용자 선택 시 입력 가능" : "수신자 ID 입력 (예: user012)"
            }
            className={`h-[50px] w-full rounded-[12px] border border-[#CCCCCC] px-4 text-sm font-medium text-[#222222] outline-none transition-all ${isUserDisabled
              ? "bg-[#F4F4F4] text-gray-400 placeholder:text-gray-400 cursor-not-allowed"
              : "bg-white placeholder:text-gray-400 hover:border-gray-400 focus:border-black shadow-sm"
              }`}
          />
        </div>
      </div>
    </div>
  );
}