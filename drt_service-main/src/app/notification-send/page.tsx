"use client";

import { useState, useMemo, useEffect } from "react";
import NotificationMessageForm from "@/features/notifications/components/NotificationMessageForm";
import NotificationSelectUser from "@/features/notifications/components/NotificationSelectUser";
import type { NotificationSendFormState, TargetUser } from "@/types/notificationSend";
import { Send, RotateCcw, AlertCircle, X, Users } from "lucide-react";
import { getUserList } from "@/lib/api/user";
import { sendNotification } from "@/lib/api/notification";

const INITIAL_FORM_STATE: NotificationSendFormState = {
  notificationType: "NOTICE",
  targetType: "SPECIFIC_USER",
  targetUserId: "",
  targetUserIds: [],
  title: "",
  content: "",
};

export default function NotificationSendPage() {
  const [formData, setFormData] =
    useState<NotificationSendFormState>(INITIAL_FORM_STATE);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    field: keyof NotificationSendFormState,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const [userList, setUserList] = useState<TargetUser[]>([]);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);


  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setLoadingUser(true);

      try {
        const result = await getUserList();
        if (isMounted) {
          setUserList(result.users ?? []);
        }
      } catch (error) {
        console.error("사용자 목록 조회 실패:", error);

      } finally {
        if (isMounted) {
          setLoadingUser(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [])


  const handleUserSelectionChange = (userIds: string[]) => {
    setFormData((prev) => ({
      ...prev,
      targetUserIds: userIds,
      targetUserId: userIds[0] || "",
    }));
  };

  const handleRemoveUser = (userId: string) => {
    handleUserSelectionChange(
      formData.targetUserIds.filter((id) => id !== userId)
    );
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_STATE);
  };

  // 선택된 유저 상세 정보 매핑
  const selectedUserObjects = useMemo(() => {
    const map = new Map(userList.map((u) => [u.userId, u]));
    return formData.targetUserIds
      .map((id) => map.get(id))
      .filter((u): u is TargetUser => !!u);
  }, [formData.targetUserIds, userList]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (formData.targetUserIds.length === 0) {
      alert("오른쪽 목록에서 수신할 사용자를 최소 1명 이상 선택해주세요.");
      return;
    }
    if (!formData.title.trim()) {
      alert("알림 제목을 입력해주세요.");
      return;
    }
    if (!formData.content.trim()) {
      alert("알림 내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      await sendNotification(formData);

      alert(
        `총 ${formData.targetUserIds.length}명에게 알림이 성공적으로 전송되었습니다.`
      );
      handleReset();
    } catch (error) {
      console.error("전송 실패:", error);
      alert("알림 전송에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      {/* 상단 헤더 */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">알림 전송</h1>
        <p className="mt-1 text-sm text-gray-500">
          왼쪽에서 메시지를 작성하고, 오른쪽에서 수신할 대상(고객/기사)을 선택하여 실시간 알림을 발송합니다.
        </p>
      </div>

      <div
        className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm"
        style={{ height: "calc(100vh - 275px)", minHeight: "680px" }}>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between min-h-0 gap-4">
          {/* 좌우 분할 2열 그리드 레이아웃 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 flex-1 min-h-0">
            {/* 왼쪽: 알림 유형 및 메시지 작성 영역 */}
            <div className="flex flex-col lg:col-span-6 h-full min-h-0">
              <NotificationMessageForm
                title={formData.title}
                content={formData.content}
                onChange={(field, val) => handleChange(field, val)}
                notificationType={formData.notificationType}
                onNotificationTypeChange={(val) => handleChange("notificationType", val)}
              />
            </div>

            {/* 오른쪽: 대상 사용자 선택 영역 (드롭박스: 전체/고객/기사, 검색, 리스트) */}
            <div className="flex flex-col lg:col-span-6 h-full min-h-0">
              <NotificationSelectUser
                selectedUserIds={formData.targetUserIds}
                onSelectionChange={handleUserSelectionChange}
                userList={userList}
                loading={loadingUser}
              />
            </div>
          </div>

          {/* 하단 요약 및 액션 바 (선택된 수신 대상 칩들을 여기에 배치) */}
          <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-[#FAFAFA] p-5 shadow-sm shrink-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              {/* 왼쪽: 선택된 수신 대상 레이블 및 태그 칩 목록 */}
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Users className="h-4 w-4 text-gray-500 shrink-0" />
                  <span className="font-bold text-[#222222]">선택된 수신 대상</span>
                  <span className="inline-flex items-center justify-center rounded-full bg-[#222222] px-2.5 py-0.5 text-xs font-bold text-white">
                    {formData.targetUserIds.length}명
                  </span>
                  {formData.targetUserIds.length === 0 && (
                    <span className="text-xs text-gray-400">
                      (오른쪽 목록에서 수신할 사용자를 선택하세요)
                    </span>
                  )}
                </div>

                {/* 선택된 사용자 칩 목록 */}
                {selectedUserObjects.length > 0 && (
                  <div className="flex max-h-[84px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {selectedUserObjects.map((user) => (
                      <span
                        key={user.userId}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium shadow-sm transition-all ${user.userType === "DRIVER"
                          ? "bg-amber-50 text-amber-900 border-amber-200"
                          : "bg-blue-50 text-blue-900 border-blue-200"
                          }`}
                      >
                        <span className="font-semibold">{user.userName}</span>
                        <span className="text-[11px] opacity-70">({user.userId})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user.userId)}
                          className="rounded-full p-0.5 hover:bg-black/10 transition-colors"
                          title="선택 해제"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 오른쪽: 액션 버튼들 */}
              <div className="flex items-center justify-end gap-3 shrink-0 pt-1 md:pt-0">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex h-[46px] min-w-[90px] items-center justify-center gap-1.5 rounded-[12px] border border-[#CCCCCC] bg-white px-4 text-sm font-bold text-[#222222] hover:bg-gray-100 transition-colors shadow-sm"
                >
                  <RotateCcw className="h-4 w-4" />
                  초기화
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-[46px] min-w-[130px] items-center justify-center gap-2 rounded-[12px] bg-[#222222] px-6 text-sm font-bold text-white hover:bg-black transition-colors disabled:bg-gray-400 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "전송 중..." : "알림 발송"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}