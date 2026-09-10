"use client";

import React from "react";
import Link from "next/link";

export default function SideBar() {
  return (
    <aside className="w-64 h-full bg-white p-4 hidden md:block">
      <div className="mb-6 hidden">
        <h2>메뉴</h2>
      </div>

      <nav className="space-y-4">
        <Link
          href="/vehicle"
          className="flex items-center w-full px-3 py-2 text-sm rounded-full text-[#363636] hover:bg-[#E6E6E6] transition-colors duration-200">
          차량관리
        </Link>
        <Link
          href="/route"
          className="flex items-center w-full px-3 py-2 text-sm rounded-full text-[#363636] hover:bg-[#E6E6E6] transition-colors duration-200">
          노선관리
        </Link>
        <Link
          href="/stop"
          className="flex items-center w-full px-3 py-2 text-sm rounded-full text-[#363636] hover:bg-[#E6E6E6] transition-colors duration-200">
          정류장관리
        </Link>
        <Link
          href="/dispatch-master"
          className="flex items-center w-full px-3 py-2 text-sm rounded-full text-[#363636] hover:bg-[#E6E6E6] transition-colors duration-200">
          배차마스터
        </Link>
        <Link
          href="/dispatch"
          className="flex items-center w-full px-3 py-2 text-sm rounded-full text-[#363636] hover:bg-[#E6E6E6] transition-colors duration-200">
          일배차관리
        </Link>
        <Link
          href="/monitoring"
          className="flex items-center w-full px-3 py-2 text-sm rounded-full text-[#363636] hover:bg-[#E6E6E6] transition-colors duration-200">
          모니터링
        </Link>
        <Link
          href="/calls"
          className="flex items-center w-full px-3 py-2 text-sm rounded-full text-[#363636] hover:bg-[#E6E6E6] transition-colors duration-200">
          호출기록
        </Link>
        <Link
          href="/selectOperLogList"
          className="flex items-center w-full px-3 py-2 text-sm rounded-full text-[#363636] hover:bg-[#E6E6E6] transition-colors duration-200">
          운행로그
        </Link>
        <Link
          href="/stats"
          className="flex items-center w-full px-3 py-2 text-sm rounded-full text-[#363636] hover:bg-[#E6E6E6] transition-colors duration-200">
          호출통계
        </Link>
      </nav>
    </aside>
  );
}
