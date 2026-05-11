import Link from "next/link";
import { ReactNode } from "react";
import { Activity, Bell, FileWarning, Gauge, LayoutDashboard, LockKeyhole, ScrollText, Search, Shield, Store, Terminal, Users } from "lucide-react";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/users", label: "Users & roles", icon: Users },
  { href: "/seller-requests", label: "Seller onboarding", icon: Store },
  { href: "/reports", label: "Reports & moderation", icon: FileWarning },
  { href: "/audit-logs", label: "Audit trail", icon: ScrollText },
  { href: "/metrics", label: "Thống kê", icon: Gauge },
  { href: "/logs", label: "System logs", icon: Terminal },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f5f9] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-slate-950 text-white xl:block">
        <div className="flex h-full flex-col p-5">
          <Link href="/" className="mb-8 flex items-center gap-3 rounded-[1.5rem] bg-white/10 p-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950"><Shield size={22} /></span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">Aeris Admin</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">Control plane</span>
            </span>
          </Link>
          <nav className="space-y-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white">
                <link.icon size={18} />
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3 text-sm font-semibold"><LockKeyhole size={17} /> Admin-only area</div>
            <p className="mt-2 text-xs leading-5 text-white/45">Khu vực dành riêng cho quản trị viên xử lý vận hành, kiểm duyệt và phân quyền.</p>
          </div>
        </div>
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-2xl">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white xl:hidden"><Shield size={20} /></Link>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Administrator workspace</p>
                <p className="text-sm font-semibold text-slate-950">Quản trị hệ thống, kiểm duyệt và giám sát vận hành</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <div className="flex h-11 w-72 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-400"><Search size={16} /> Tìm user, report, log...</div>
              <button className="premium-icon-button"><Bell size={18} /></button>
              <Link href="/login" className="premium-button-light px-4 py-2">Admin login</Link>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-4 xl:hidden">
            {links.map((link) => <Link key={link.href} href={link.href} className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">{link.label}</Link>)}
          </nav>
        </header>
        <main className="px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function AdminPageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="text-4xl font-light tracking-tight text-slate-950 md:text-6xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
        <Activity size={15} /> System nominal
      </div>
    </div>
  );
}
