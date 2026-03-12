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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Play, Clock, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Run = Database["public"]["Tables"]["runs"]["Row"];
type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

const statusVariant = {
  completed: "default",
  running: "outline",
  failed: "destructive",
} as const;

interface RunResult {
  competitor_name: string;
  findings_count: number;
  sources_used: number;
  debug?: {
    hn_stories: number;
    hn_comments: number;
    reddit_posts: number;
    reddit_comments: number;
    youtube_videos: number;
    youtube_comments: number;
  };
}

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<string>>(
    new Set()
  );
  const [apiKey, setApiKey] = useState("");
  const [productName, setProductName] = useState("");
  const [productContext, setProductContext] = useState(""
  );
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const [currentCompetitor, setCurrentCompetitor] = useState<string>("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const supabase = createClient();

  async function loadData() {
    const [runsRes, competitorsRes] = await Promise.all([
      supabase
        .from("runs")
        .select("*")
        .order("started_at", { ascending: false }),
      supabase
        .from("competitors")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    setRuns((runsRes.data as Run[]) ?? []);
    const loadedCompetitors = (competitorsRes.data as Competitor[]) ?? [];
    setCompetitors(loadedCompetitors);
    setLoading(false);
  }

  useEffect(() => {
    setApiKey(localStorage.getItem("recon_gemini_key") ?? "");
    setProductName(localStorage.getItem("recon_product_name") ?? "Google Vids");
    setProductContext(
      localStorage.getItem("recon_product_context") ??
        "AI-powered video creation tool within Google Workspace. Core users: marketing teams, L&D, enterprise communications."
    );
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCompetitor(id: string) {
    setSelectedCompetitors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    if (selectedCompetitors.size === competitors.length) {
      setSelectedCompetitors(new Set());
    } else {
      setSelectedCompetitors(new Set(competitors.map((c) => c.id)));
    }
  }

  async function handleRun() {
    if (selectedCompetitors.size === 0 || !apiKey) return;

    const selected = competitors.filter((c) => selectedCompetitors.has(c.id));
    setRunning(true);
    setRunResults([]);
    setProgress({ current: 0, total: selected.length });

    for (let i = 0; i < selected.length; i++) {
      const competitor = selected[i];
      setCurrentCompetitor(competitor.name);
      setProgress({ current: i + 1, total: selected.length });

      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competitor_id: competitor.id,
            competitor_name: competitor.name,
            product_name: productName,
            product_context: productContext,
            gemini_api_key: apiKey,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setRunResults((prev) => [
            ...prev,
            {
              competitor_name: competitor.name,
              findings_count: data.findings_count,
              sources_used: data.sources_used,
              debug: data.debug,
            },
          ]);
        } else {
          setRunResults((prev) => [
            ...prev,
            {
              competitor_name: competitor.name,
              findings_count: -1,
              sources_used: 0,
            },
          ]);
        }
      } catch {
        setRunResults((prev) => [
          ...prev,
          {
            competitor_name: competitor.name,
            findings_count: -1,
            sources_used: 0,
          },
        ]);
      }
    }

    setCurrentCompetitor("");
    setRunning(false);
    await loadData();
  }

  function formatDuration(startedAt: string, completedAt: string | null) {
    if (!completedAt) return "—";
    const ms =
      new Date(completedAt).getTime() - new Date(startedAt).getTime();
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}m ${remaining}s`;
  }

  function getCompetitorName(id: string) {
    return competitors.find((c) => c.id === id)?.name ?? "—";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalFindings = runResults.reduce(
    (sum, r) => sum + (r.findings_count > 0 ? r.findings_count : 0),
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Runs</h1>
          <p className="text-muted-foreground">
            Analysis run history and manual triggers
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button disabled={competitors.length === 0}>
                <Play className="mr-2 h-4 w-4" />
                Run Now
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Run Analysis</DialogTitle>
              <DialogDescription>
                Select competitors to analyze. Each runs sequentially.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Competitor multi-select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Competitors</Label>
                  <button
                    onClick={selectAll}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {selectedCompetitors.size === competitors.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>
                <div className="space-y-1 rounded-lg border border-border p-2 max-h-48 overflow-y-auto">
                  {competitors.map((c) => {
                    const isSelected = selectedCompetitors.has(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCompetitor(c.id)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/50"
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="flex-1">{c.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.priority}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedCompetitors.size} of {competitors.length} selected
                </p>
              </div>

              <div className="space-y-2">
                <Label>Your Product Name</Label>
                <Input
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    localStorage.setItem("recon_product_name", e.target.value);
                  }}
                  placeholder="e.g. Google Vids"
                />
              </div>
              <div className="space-y-2">
                <Label>Product Context</Label>
                <Input
                  value={productContext}
                  onChange={(e) => {
                    setProductContext(e.target.value);
                    localStorage.setItem("recon_product_context", e.target.value);
                  }}
                  placeholder="Brief description of your product and users"
                />
              </div>
              <div className="space-y-2">
                <Label>Gemini API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    localStorage.setItem("recon_gemini_key", e.target.value);
                  }}
                  placeholder="AIza..."
                />
              </div>
              <Button
                onClick={handleRun}
                className="w-full"
                disabled={running || selectedCompetitors.size === 0 || !apiKey}
              >
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing {currentCompetitor} ({progress.current}/
                    {progress.total})...
                  </>
                ) : (
                  `Run ${selectedCompetitors.size} competitor${selectedCompetitors.size !== 1 ? "s" : ""}`
                )}
              </Button>

              {/* Results summary */}
              {runResults.length > 0 && (
                <div className="rounded-lg bg-secondary p-4 space-y-2">
                  <p className="text-sm font-medium">
                    {running ? "Progress" : "Complete"} — {totalFindings} finding
                    {totalFindings !== 1 ? "s" : ""} total
                  </p>
                  {runResults.map((r) => (
                    <div
                      key={r.competitor_name}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span>{r.competitor_name}</span>
                      {r.findings_count >= 0 ? (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-600" />
                          {r.findings_count} finding{r.findings_count !== 1 ? "s" : ""} from {r.sources_used} source{r.sources_used !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-destructive">Failed</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {competitors.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Add a competitor first before running an analysis.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run History</CardTitle>
          <CardDescription>
            {runs.length === 0
              ? "No runs yet — click Run Now to start"
              : `${runs.length} run${runs.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competitor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">
                      {getCompetitorName(run.competitor_id)}
                    </TableCell>
                    <TableCell>
                      {new Date(run.started_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="capitalize">{run.type}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusVariant[
                            run.status as keyof typeof statusVariant
                          ] ?? "secondary"
                        }
                      >
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{run.findings_count}</TableCell>
                    <TableCell>{run.sources_used}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDuration(run.started_at, run.completed_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Run history will appear here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
