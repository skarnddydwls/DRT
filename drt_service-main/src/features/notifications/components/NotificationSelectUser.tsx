"use client";

import { useState, useMemo } from "react";
import { Search, Users, User, Car, X, CheckSquare, Square, RotateCcw, Loader2 } from "lucide-react";
import { CustomSelect, CustomOption } from "@/components/ui/CustomSelect";
import type { TargetUser, UserCategory } from "@/types/notificationSend";

interface NotificationSelectUserProps {
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  userList?: TargetUser[];
  loading?: boolean;
}

export default function NotificationSelectUser({
  selectedUserIds,
  onSelectionChange,
  userList = [],
  loading = false,
}: NotificationSelectUserProps) {
  const [category, setCategory] = useState<UserCategory>("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");

  // 필터링된 유저 목록 계산
  const filteredUsers = useMemo(() => {
    return userList.filter((user) => {
      // 1. 카테고리 필터 (전체 / 고객 / 기사)
      if (category === "PASSENGER" && user.userType !== "PASSENGER") return false;
      if (category === "DRIVER" && user.userType !== "DRIVER") return false;

      // 2. 검색어 필터 (이름, ID, 전화번호, 부가정보)
      if (searchKeyword.trim()) {
        const keyword = searchKeyword.toLowerCase();
        const matchesName = user.userName.toLowerCase().includes(keyword);
        const matchesId = user.userId.toLowerCase().includes(keyword);
        const matchesPhone = user.phone?.includes(keyword) ?? false;
        const matchesSub = user.subInfo?.toLowerCase().includes(keyword) ?? false;
        return matchesName || matchesId || matchesPhone || matchesSub;
      }

      return true;
    });
  }, [userList, category, searchKeyword]);

  // 개별 토글
  const handleToggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onSelectionChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onSelectionChange([...selectedUserIds, userId]);
    }
  };

  // 현재 필터된 항목 전체 선택/해제
  const isAllFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selectedUserIds.includes(u.userId));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // 현재 필터된 유저들만 선택 해제
      const filteredIds = new Set(filteredUsers.map((u) => u.userId));
      onSelectionChange(selectedUserIds.filter((id) => !filteredIds.has(id)));
    } else {
      // 현재 필터된 유저들 추가
      const newIds = new Set([...selectedUserIds, ...filteredUsers.map((u) => u.userId)]);
      onSelectionChange(Array.from(newIds));
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-full min-h-0">
      {/* 헤더 타이틀 및 선택 현황 */}
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          {/* <Users className="h-5 w-5 text-[#222222]" /> */}
          <h2 className="text-sm font-bold text-[#222222]">수신 대상 선택</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">선택된 대상</span>
          <span className="inline-flex items-center justify-center rounded-full bg-[#222222] px-2.5 py-0.5 text-xs font-bold text-white">
            {selectedUserIds.length}명
          </span>
          {selectedUserIds.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectionChange([])}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
              title="선택 초기화"
            >
              <RotateCcw className="h-3 w-3" />
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 필터 컨트롤: 드롭박스(전체/고객/기사) + 검색창 */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* 드롭박스 (전체 / 고객 / 기사) */}
        <div className="w-full sm:w-[150px] shrink-0">
          <CustomSelect
            value={category}
            onChange={(val) => setCategory(val as UserCategory)}
          >
            <CustomOption value="ALL">전체 대상</CustomOption>
            <CustomOption value="PASSENGER">고객 (승객)</CustomOption>
            <CustomOption value="DRIVER">기사 (운전자)</CustomOption>
          </CustomSelect>
        </div>

        {/* 검색 인풋 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="이름, 아이디, 전화번호 검색"
            className="h-[50px] w-full rounded-[12px] border border-[#CCCCCC] pl-10 pr-9 text-sm text-[#222222] outline-none placeholder:text-gray-400 hover:border-gray-400 focus:border-black transition-all"
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 테이블/리스트 상단 바 (전체선택 체크박스 & 결과 카운트) */}
      <div className="mb-2 flex items-center justify-between px-1 text-xs text-gray-500">
        <button
          type="button"
          onClick={handleToggleSelectAll}
          className="flex items-center gap-1.5 font-medium text-[#222222] hover:text-black transition-colors"
        >
          {isAllFilteredSelected ? (
            <CheckSquare className="h-4 w-4 text-black" />
          ) : (
            <Square className="h-4 w-4 text-gray-400" />
          )}
          <span>현재 목록 전체 선택 ({filteredUsers.length}명)</span>
        </button>
        <span>
          {filteredUsers.length}명 조회됨
        </span>
      </div>

      {/* 사용자 목록 스크롤 영역 (항목 증가 시 내부 스크롤 적용) */}
      <div className="flex-1 min-h-[320px] overflow-y-auto rounded-[12px] border border-gray-200 bg-[#FAFAFA]">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-gray-400" />
            <p className="text-sm font-medium">사용자 목록을 불러오는 중...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
            {/* <Users className="mb-2 h-8 w-8 text-gray-300" /> */}
            <p className="text-sm font-medium">검색 결과가 없습니다.</p>
            <p className="text-xs">필터 조건을 변경하거나 검색어를 확인해보세요.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.userId);
              const isDriver = user.userType === "DRIVER";

              return (
                <li
                  key={user.userId}
                  onClick={() => handleToggleUser(user.userId)}
                  className={`flex cursor-pointer items-center justify-between px-4 py-3 transition-colors ${isSelected
                    ? "bg-blue-50/60 hover:bg-blue-50"
                    : "bg-white hover:bg-gray-50"
                    }`}
                >
                  {/* 왼쪽: 체크박스 + 유저 정보 */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }} // 부모 li onClick에서 처리
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#222222]">
                          {user.userName}
                        </span>
                        <span className="text-xs text-gray-400">({user.userId})</span>

                        {/* 구분 배지 */}
                        {isDriver ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                            <Car className="h-3 w-3" />
                            기사
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
                            <User className="h-3 w-3" />
                            고객
                          </span>
                        )}
                      </div>

                      {/* 보조 정보: 전화번호 & 추가정보 */}
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {user.phone && <span>{user.phone}</span>}
                        {user.phone && user.subInfo && <span>•</span>}
                        {user.subInfo && <span>{user.subInfo}</span>}
                      </div>
                    </div>
                  </div>

                  {/* 오른쪽: 선택 상태 표시 */}
                  <div className="text-xs">
                    {isSelected ? (
                      <span className="font-semibold text-blue-600">선택됨</span>
                    ) : (
                      <span className="text-gray-300">선택</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
