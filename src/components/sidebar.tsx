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

const VIEWED_KEY = "recon_findings_last_viewed";

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
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    // Mark findings as viewed when on the findings page
    if (pathname.startsWith("/findings")) {
      localStorage.setItem(VIEWED_KEY, new Date().toISOString());
      setUnseenCount(0);
      return;
    }

    // On other pages, count high-threat findings created since last viewed
    const lastViewed = localStorage.getItem(VIEWED_KEY);
    const supabase = createClient();

    let query = supabase
      .from("findings")
      .select("id", { count: "exact", head: true })
      .eq("threat_level", "High");

    if (lastViewed) {
      query = query.gt("created_at", lastViewed);
    }

    query.then(({ count }) => setUnseenCount(count ?? 0));
  }, [pathname]);

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
              {item.badge && unseenCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                  {unseenCount}
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
