import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { menuGroups } from "@/lib/navigation";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white px-7 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DRT 운영센터</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/monitoring" className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
            모니터링 열기 <ArrowRight aria-hidden="true" size={16} />
          </Link>
          <Link href="/dispatch" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            일배차관리 열기 <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </section>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      {[menuGroups[0], menuGroups[2], menuGroups[1], menuGroups[3]].map((group) => (
        <section key={group.label} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby={`home-${group.items[0][0].slice(1)}`}>
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h2 id={`home-${group.items[0][0].slice(1)}`} className="text-lg font-bold">{group.label}</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">{group.description}</p>
          </div>
          <div className={`grid grid-cols-1 gap-3 ${group.items.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {group.items.map(([href, label, description]) => (
              <Link key={href} href={href} className="group rounded-xl border border-slate-200 bg-slate-50/40 p-4 transition-colors hover:border-green-500 hover:bg-green-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
                  <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-slate-400 group-hover:text-green-700" />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
      </div>
    </div>
  );
}
