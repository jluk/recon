"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  AlertTriangle,
  Clock,
  FileText,
  ArrowRight,
  Radar,
  Play,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Finding = Database["public"]["Tables"]["findings"]["Row"];
type Competitor = Database["public"]["Tables"]["competitors"]["Row"];
type Run = Database["public"]["Tables"]["runs"]["Row"];

const threatColors: Record<string, "destructive" | "outline" | "secondary" | "ghost"> = {
  High: "destructive",
  Medium: "outline",
  Low: "secondary",
  Monitor: "ghost",
};

export default function DashboardPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [competitorsRes, findingsRes, runsRes] = await Promise.all([
        supabase.from("competitors").select("*"),
        supabase
          .from("findings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("runs")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(1),
      ]);

      setCompetitors((competitorsRes.data as Competitor[]) ?? []);
      setFindings((findingsRes.data as Finding[]) ?? []);
      setRuns((runsRes.data as Run[]) ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getCompetitorName(id: string) {
    return competitors.find((c) => c.id === id)?.name ?? "Unknown";
  }

  function timeAgo(date: string) {
    const seconds = Math.floor(
      (Date.now() - new Date(date).getTime()) / 1000
    );
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const lastRun = runs[0] ?? null;
  const highThreatCount = findings.filter(
    (f) => f.threat_level === "High"
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Competitive intelligence overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Competitors
            </CardDescription>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competitors.length}</div>
            <p className="text-xs text-muted-foreground">
              {competitors.length === 0
                ? "Add your first competitor"
                : `${competitors.filter((c) => c.priority === "Primary").length} primary`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Findings
            </CardDescription>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{findings.length}</div>
            <p className="text-xs text-muted-foreground">
              {highThreatCount > 0
                ? `${highThreatCount} high threat`
                : "No high threats"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Sources
            </CardDescription>
            <Radar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              HN, Reddit, YouTube
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Last Run
            </CardDescription>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastRun ? timeAgo(lastRun.started_at) : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastRun
                ? `${lastRun.findings_count} findings, ${lastRun.sources_used} sources`
                : "No runs yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Findings</CardTitle>
            <CardDescription>
              Latest claim vs. reality gaps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {findings.length > 0 ? (
              <>
                {findings.map((finding) => (
                  <Link
                    key={finding.id}
                    href={`/findings/${finding.id}`}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug truncate">
                        {finding.claim}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getCompetitorName(finding.competitor_id)} &middot;{" "}
                        {timeAgo(finding.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        threatColors[finding.threat_level] ?? "secondary"
                      }
                    >
                      {finding.threat_level}
                    </Badge>
                  </Link>
                ))}
                <Link
                  href="/findings"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground pt-1"
                >
                  View all findings <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No findings yet. Run an analysis to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Jump in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/runs"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
            >
              <Play className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Run Analysis</p>
                <p className="text-xs text-muted-foreground">
                  Fetch sources and analyze competitors
                </p>
              </div>
            </Link>
            <Link
              href="/competitors"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
            >
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Manage Competitors</p>
                <p className="text-xs text-muted-foreground">
                  {competitors.length} tracked
                </p>
              </div>
            </Link>
            <Link
              href="/findings"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
            >
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">View Findings</p>
                <p className="text-xs text-muted-foreground">
                  {findings.length} findings across{" "}
                  {new Set(findings.map((f) => f.competitor_id)).size}{" "}
                  competitors
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
