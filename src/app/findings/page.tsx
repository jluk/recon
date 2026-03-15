"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Filter,
  Loader2,
  AlertTriangle,
  Shield,
  Eye,
  ArrowRight,
  Trash2,
  CheckSquare,
  Square,
  Search,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { filterFindings } from "@/lib/findings-filter";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [competitorFilter, setCompetitorFilter] = useState<string>("all");
  const [threatFilter, setThreatFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const supabase = createClient();

  async function loadFindings() {
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

  useEffect(() => {
    loadFindings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getCompetitorName(id: string) {
    return competitors.find((c) => c.id === id)?.name ?? "Unknown";
  }

  const filtered = filterFindings(findings, {
    competitorId: competitorFilter,
    threatLevel: threatFilter,
    confidence: confidenceFilter,
    search: searchQuery,
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((f) => f.id)));
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
    setConfirmDelete(false);
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    setDeleting(true);

    const ids = Array.from(selected);
    const { error } = await supabase
      .from("findings")
      .delete()
      .in("id", ids);

    if (!error) {
      setFindings((prev) => prev.filter((f) => !selected.has(f.id)));
      exitSelectMode();
    }
    setDeleting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const highCount = findings.filter((f) => f.threat_level === "High").length;
  const medCount = findings.filter((f) => f.threat_level === "Medium").length;
  const lowCount = findings.filter((f) => f.threat_level === "Low").length;
  const monitorCount = findings.filter((f) => f.threat_level === "Monitor").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Findings</h1>
          <p className="text-muted-foreground">
            Where competitor claims meet user reality
          </p>
        </div>
        {findings.length > 0 && !selectMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectMode(true)}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Select
          </Button>
        )}
      </div>

      {/* Threat breakdown strip */}
      {findings.length > 0 && (
        <div className="flex gap-3">
          {highCount > 0 && (
            <button
              onClick={() => setThreatFilter(threatFilter === "High" ? "all" : "High")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                threatFilter === "High"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-border hover:border-destructive/30 text-muted-foreground hover:text-destructive"
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              {highCount} High
            </button>
          )}
          {medCount > 0 && (
            <button
              onClick={() => setThreatFilter(threatFilter === "Medium" ? "all" : "Medium")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                threatFilter === "Medium"
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-600"
                  : "border-border hover:border-orange-500/30 text-muted-foreground hover:text-orange-600"
              }`}
            >
              <Shield className="h-3 w-3" />
              {medCount} Medium
            </button>
          )}
          {lowCount > 0 && (
            <button
              onClick={() => setThreatFilter(threatFilter === "Low" ? "all" : "Low")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                threatFilter === "Low"
                  ? "border-foreground/20 bg-secondary text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3 w-3" />
              {lowCount} Low
            </button>
          )}
          {monitorCount > 0 && (
            <button
              onClick={() => setThreatFilter(threatFilter === "Monitor" ? "all" : "Monitor")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                threatFilter === "Monitor"
                  ? "border-foreground/20 bg-secondary text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3 w-3" />
              {monitorCount} Monitor
            </button>
          )}
        </div>
      )}

      {/* Select mode toolbar */}
      {selectMode && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3">
          <button
            onClick={selectAllVisible}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {selected.size === filtered.length && filtered.length > 0
              ? "Deselect all"
              : `Select all ${filtered.length}`}
          </button>
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="flex-1" />
          {!confirmDelete ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={selected.size === 0}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive">
                Delete {selected.size} finding{selected.size !== 1 ? "s" : ""}?
              </span>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={deleteSelected}
              >
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={exitSelectMode}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search findings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-[220px]"
          />
        </div>
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
          const isSelected = selected.has(finding.id);

          const card = (
            <div className={`group rounded-xl border px-5 py-4 transition-all ${
              isSelected
                ? "border-foreground/30 bg-secondary/40"
                : "border-border hover:border-foreground/20 hover:bg-secondary/20"
            }`}>
              <div className="flex gap-4">
                {/* Checkbox or threat icon */}
                <div className="flex flex-col items-center pt-1">
                  {selectMode ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSelect(finding.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-secondary"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-foreground" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  ) : (
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
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Claim as title */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold leading-snug">
                      {finding.claim}
                    </p>
                    {!selectMode && (
                      <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>

                  {/* Reality preview */}
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mt-1">
                    {finding.reality}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={threat.variant}>{threat.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {finding.confidence} confidence
                    </span>
                    <span className="text-xs text-muted-foreground">&middot;</span>
                    <span className="text-xs text-muted-foreground">
                      {getCompetitorName(finding.competitor_id)}
                    </span>
                    <span className="text-xs text-muted-foreground">&middot;</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(finding.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );

          if (selectMode) {
            return (
              <div
                key={finding.id}
                className="cursor-pointer"
                onClick={() => toggleSelect(finding.id)}
              >
                {card}
              </div>
            );
          }

          return (
            <Link key={finding.id} href={`/findings/${finding.id}`}>
              {card}
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
            No findings match {searchQuery ? `"${searchQuery}"` : "the current filters"}.
          </div>
        )}
      </div>
    </div>
  );
}
