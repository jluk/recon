"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  Filter,
  Loader2,
  AlertTriangle,
  Shield,
  Eye,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Finding = Database["public"]["Tables"]["findings"]["Row"];
type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

const threatConfig: Record<
  string,
  { variant: "destructive" | "outline" | "secondary" | "ghost"; icon: typeof AlertTriangle; label: string }
> = {
  High: { variant: "destructive", icon: AlertTriangle, label: "High Threat" },
  Medium: { variant: "outline", icon: Shield, label: "Medium Threat" },
  Low: { variant: "secondary", icon: Eye, label: "Low Threat" },
  Monitor: { variant: "ghost", icon: Eye, label: "Monitor" },
};

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [competitorFilter, setCompetitorFilter] = useState<string>("all");
  const [threatFilter, setThreatFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [findingsRes, competitorsRes] = await Promise.all([
        supabase
          .from("findings")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("competitors").select("*"),
      ]);

      setFindings((findingsRes.data as Finding[]) ?? []);
      setCompetitors((competitorsRes.data as Competitor[]) ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getCompetitorName(id: string) {
    return competitors.find((c) => c.id === id)?.name ?? "Unknown";
  }

  const filtered = findings.filter((f) => {
    if (competitorFilter !== "all" && f.competitor_id !== competitorFilter) return false;
    if (threatFilter !== "all" && f.threat_level !== threatFilter) return false;
    if (confidenceFilter !== "all" && f.confidence !== confidenceFilter)
      return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Findings</h1>
        <p className="text-muted-foreground">
          Where competitor claims meet user reality
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={competitorFilter}
          onValueChange={(v) => setCompetitorFilter(v ?? "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Competitor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Competitors</SelectItem>
            {competitors.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={threatFilter}
          onValueChange={(v) => setThreatFilter(v ?? "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Threat Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Threat Levels</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Monitor">Monitor</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={confidenceFilter}
          onValueChange={(v) => setConfidenceFilter(v ?? "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Confidence</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} finding{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {filtered.map((finding) => {
          const threat =
            threatConfig[finding.threat_level] ?? threatConfig.Monitor;
          const ThreatIcon = threat.icon;

          return (
            <Link key={finding.id} href={`/findings/${finding.id}`}>
              <div className="group rounded-xl border border-border p-5 transition-all hover:border-foreground/20 hover:bg-secondary/20">
                <div className="flex gap-4">
                  {/* Threat indicator bar */}
                  <div className="flex flex-col items-center gap-2 pt-0.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        finding.threat_level === "High"
                          ? "bg-destructive/10 text-destructive"
                          : finding.threat_level === "Medium"
                            ? "bg-orange-500/10 text-orange-600"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <ThreatIcon className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={threat.variant}>{threat.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {finding.confidence} confidence
                      </span>
                      <span className="text-xs text-muted-foreground">
                        &middot;
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getCompetitorName(finding.competitor_id)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        &middot;
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(finding.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Claim as title */}
                    <p className="text-sm font-semibold leading-snug mb-2">
                      {finding.claim}
                    </p>

                    {/* Reality as summary */}
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {finding.reality}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {finding.sources.map((source) => (
                          <span
                            key={source}
                            className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {findings.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">No findings yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Run an analysis from the Runs page to generate findings.
            </p>
          </div>
        )}

        {findings.length > 0 && filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            No findings match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
