"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuGroups = [
  {
    label: "운영관리",
    items: [
      ["/vehicle", "차량관리"],
      ["/stop", "정류장관리"],
      ["/route", "노선관리"],
      ["/route-edit", "노선편집"],
      ["/notification-send", "알림전송"],
      ["/replacement-vehicle", "대차관리"],
      ["/dispatch-master", "배차마스터"],
      ["/dispatch", "일배차관리"],
    ],
  },
  {
    label: "실시간 관제",
    items: [["/monitoring", "모니터링"]],
  },
  {
    label: "이력·통계",
    items: [
      ["/calls", "호출기록"],
      ["/selectOperLogList", "운행기록"],
      ["/incident-history", "유고정보 이력"],
      ["/notification-history", "알림전송 이력"],
      ["/replacement-vehicle-history", "대차이력"],
      ["/cancellation-history", "결항정보 이력"],
      ["/stats", "호출통계"],
    ],
  },
  {
    label: "환경설정",
    items: [["/common-code", "공통코드 관리"]],
  },
] as const;

export default function Header() {
  const pathname = usePathname();
  const activeGroup = menuGroups.find((group) =>
    group.items.some(([href]) => pathname === href || pathname.startsWith(`${href}/`)));

  return (
    <header className="relative z-50 w-full bg-[#242424] text-white">
      <div className="mx-auto flex h-20 max-w-[1520px] items-center gap-16 px-6">
        <Link href="/" className="shrink-0 text-xl font-bold tracking-tight">
          전라남도 도서지역 특화 DRT
        </Link>
        <nav className="flex h-full items-center gap-3 text-[15px] font-semibold">
          {menuGroups.map((menuGroup) => {
            const active = menuGroup === activeGroup;
            return (
              <div key={menuGroup.label} className="group relative flex h-full items-center">
                <Link
                  href={menuGroup.items[0][0]}
                  className={`flex h-10 items-center rounded-lg px-5 transition-colors ${active
                    ? "bg-[#39d45a] text-[#142619]"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                    }`}>
                  {menuGroup.label}
                </Link>

                <div className="invisible absolute left-0 top-full min-w-48 translate-y-1 pt-2 opacity-0 transition-[opacity,transform] duration-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 text-sm font-medium text-slate-700 shadow-xl">
                    {menuGroup.items.map(([href, label]) => {
                      const childActive = pathname === href || pathname.startsWith(`${href}/`);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={`flex whitespace-nowrap rounded-lg px-4 py-2.5 transition-colors ${childActive
                            ? "bg-green-50 font-semibold text-[#21a943]"
                            : "hover:bg-slate-100 hover:text-slate-950"
                            }`}>
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
