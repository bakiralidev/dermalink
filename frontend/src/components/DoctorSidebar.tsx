"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DoctorSidebarProps {
  activeModel?: string;
}

function navClass(active: boolean): string {
  if (active) {
    return "block w-full text-left px-4 py-3 rounded-xl text-sm font-black border premium-gradient text-white border-transparent btn-press";
  }
  return "block w-full text-left px-4 py-3 rounded-xl text-sm font-black border border-border hover:border-primary/45 hover:bg-primary/5 btn-press";
}

export default function DoctorSidebar({ activeModel = "default" }: DoctorSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-72 border-r border-border glass flex-col p-6 sticky top-0 h-dvh">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white ring-1 ring-primary/20 shadow-lg shrink-0">
          <img src="/brand-logo.png" alt="DermaLink logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="font-black text-2xl tracking-tight">DermaLink</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-black">Doctor Console</p>
        </div>
      </div>

      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
        <Link href="/" className={navClass(pathname === "/")}>Ish stoli</Link>
        <Link href="/doctor/patients" className={navClass(pathname === "/doctor/patients")}>Ayni bemorlar</Link>
        <Link href="/doctor/history" className={navClass(pathname === "/doctor/history")}>Kasalliklar tarixi</Link>
        <Link href="/doctor/models" className={navClass(pathname === "/doctor/models")}>Model nazorati</Link>
        <Link href="/doctor/actions" className={navClass(pathname === "/doctor/actions")}>Doktor amallari</Link>
      </div>

      <div className="mt-auto surface-panel p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] font-black opacity-60">Aktiv model</p>
        <p className="font-black text-lg mt-1 uppercase">{activeModel}</p>
      </div>
    </aside>
  );
}
