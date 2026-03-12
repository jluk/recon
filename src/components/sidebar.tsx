"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Search,
  FileText,
  Settings,
  Radar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Competitors", href: "/competitors", icon: Target },
  { name: "Sources", href: "/sources", icon: Search },
  { name: "Findings", href: "/findings", icon: FileText, badge: true },
  { name: "Runs", href: "/runs", icon: Radar },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [highCount, setHighCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("findings")
      .select("id", { count: "exact", head: true })
      .eq("threat_level", "High")
      .then(({ count }) => setHighCount(count ?? 0));
  }, [pathname]); // refresh on navigation

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-6">
        <Radar className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold tracking-tight">Recon</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.name}</span>
              {item.badge && highCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                  {highCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">
          Competitive Intelligence
        </p>
      </div>
    </aside>
  );
}
