"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Panel" },
  { href: "/doctor/patients", label: "Bemorlar" },
  { href: "/doctor/history", label: "Tarix" },
  { href: "/doctor/models", label: "Modellar" },
  { href: "/doctor/actions", label: "Amallar" },
];

export default function DoctorTopNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden flex flex-wrap gap-2">
      {links.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`btn-press px-3 py-2 rounded-xl text-xs font-black border ${active ? "premium-gradient text-white border-transparent" : "border-border hover:border-primary/45 hover:bg-primary/5"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
