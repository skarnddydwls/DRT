"use client";

import { CustomSelect, CustomOption } from "@/components/ui/CustomSelect";
import { MessageSquare } from "lucide-react";

interface NotificationMessageFormProps {
  title: string;
  content: string;
  onChange: (field: "title" | "content", value: string) => void;
  notificationType?: string;
  onNotificationTypeChange?: (value: string) => void;
}

export default function NotificationMessageForm({
  title,
  content,
  onChange,
  notificationType,
  onNotificationTypeChange,
}: NotificationMessageFormProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm min-h-0">
      <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
        <MessageSquare className="h-5 w-5 text-[#222222]" />
        <h2 className="text-sm font-bold text-[#222222]">메시지 작성</h2>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        {/* 알림 유형 선택 (옵션 제공 시) */}
        {notificationType !== undefined && onNotificationTypeChange && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[#222222]">
              알림 유형 <span className="text-red-500">*</span>
            </label>
            <CustomSelect
              value={notificationType}
              onChange={onNotificationTypeChange}
            >
              <CustomOption value="NOTICE">일반 공지</CustomOption>
              <CustomOption value="DELAY_CANCEL">지연 / 결항 안내</CustomOption>
              <CustomOption value="URGENT">사고 / 긴급 재난</CustomOption>
              <CustomOption value="ROUTE_CHANGE">노선 우회 안내</CustomOption>
            </CustomSelect>
          </div>
        )}

        {/* 제목 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#222222]">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="알림 제목을 입력하세요"
            className="h-[50px] w-full rounded-[12px] border border-[#CCCCCC] px-4 text-sm text-[#222222] outline-none placeholder:text-gray-400 hover:border-gray-400 focus:border-black transition-all"
            maxLength={100}
          />
        </div>

        {/* 내용 */}
        <div className="flex flex-1 flex-col min-h-0 gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-[#222222]">
              내용 <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-gray-400">
              {content.length} / 500자
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => onChange("content", e.target.value)}
            placeholder="발송할 알림 상세 내용을 입력하세요."
            rows={8}
            maxLength={500}
            className="w-full flex-1 min-h-0 resize-none rounded-[12px] border border-[#CCCCCC] p-4 text-sm text-[#222222] outline-none placeholder:text-gray-400 hover:border-gray-400 focus:border-black leading-relaxed transition-all"
          />
        </div>
      </div>
    </div>
  );
}