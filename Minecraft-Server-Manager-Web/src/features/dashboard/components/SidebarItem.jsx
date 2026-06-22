"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarItem({ href, icon, label }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  const baseClasses = "flex items-center gap-3 px-4 py-3 rounded-blocky transition-all font-bold";
  const activeClasses = isActive 
    ? "bg-primary text-primary-foreground border-2 border-primary" 
    : "text-foreground hover:bg-surface-hover border-2 border-transparent";

  return (
    <Link href={href} className={`${baseClasses} ${activeClasses}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
