"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Shield,
  Eye,
  FlaskConical,
  Flag,
  CheckCircle2,
  Siren,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Finding = Database["public"]["Tables"]["findings"]["Row"];
type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

const threatConfig: Record<
  string,
  { variant: "destructive" | "outline" | "secondary" | "ghost"; icon: typeof AlertTriangle }
> = {
  High: { variant: "destructive", icon: AlertTriangle },
  Medium: { variant: "outline", icon: Shield },
  Low: { variant: "secondary", icon: Eye },
  Monitor: { variant: "ghost", icon: Eye },
};

const actionConfig: Record<
  string,
  { icon: typeof CheckCircle2; color: string }
> = {
  "No action needed": { icon: CheckCircle2, color: "text-muted-foreground" },
  "Flag to team": { icon: Flag, color: "text-orange-600" },
  "Manual test recommended": { icon: FlaskConical, color: "text-blue-600" },
  Escalate: { icon: Siren, color: "text-destructive" },
};

export default function FindingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [finding, setFinding] = useState<Finding | null>(null);
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: f } = await supabase
        .from("findings")
        .select("*")
        .eq("id", id)
        .single();

      if (f) {
        const finding = f as Finding;
        setFinding(finding);
        const { data: c } = await supabase
          .from("competitors")
          .select("*")
          .eq("id", finding.competitor_id)
          .single();
        setCompetitor(c as Competitor | null);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="space-y-4">
        <Link
          href="/findings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Findings
        </Link>
        <p className="text-muted-foreground">Finding not found.</p>
      </div>
    );
  }

  const threat =
    threatConfig[finding.threat_level] ?? threatConfig.Monitor;
  const action =
    actionConfig[finding.recommended_action] ?? actionConfig["No action needed"];
  const ActionIcon = action.icon;
  const testingCriteria = finding.testing_criteria as {
    what_to_test?: string;
    what_to_look_for?: string;
    what_changes_assessment?: string;
  } | null;

  return (
    <div className="space-y-8 max-w-3xl">
      <Link
        href="/findings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Findings
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={threat.variant}>
            {finding.threat_level} Threat
          </Badge>
          <Badge variant="outline">{finding.confidence} Confidence</Badge>
          <span className="text-sm text-muted-foreground">
            {competitor?.name} &middot;{" "}
            {new Date(finding.created_at).toLocaleDateString()}
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight leading-snug">
          {finding.claim}
        </h1>
      </div>

      {/* The Gap — this is the core insight */}
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-border bg-secondary/30 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            They say
          </p>
          <p className="text-sm leading-relaxed">{finding.claim}</p>
        </div>

        <div className="rounded-xl border-2 border-foreground/10 bg-background p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Users say
          </p>
          <p className="text-sm leading-relaxed">{finding.reality}</p>
        </div>
      </div>

      {/* Sources */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Corroborated by
        </p>
        <div className="flex flex-wrap gap-2">
          {finding.sources.map((source) => (
            <span
              key={source}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              {source}
            </span>
          ))}
        </div>
      </div>

      {/* So What — the actionable part */}
      {finding.why_it_matters && (
        <div className="rounded-xl border border-border p-6 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            So what
          </p>

          <p className="text-sm leading-relaxed">{finding.why_it_matters}</p>

          {finding.user_segment_overlap && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Users at risk
              </p>
              <p className="text-sm leading-relaxed">
                {finding.user_segment_overlap}
              </p>
            </div>
          )}

          {finding.compensating_advantages && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Your advantages
              </p>
              <p className="text-sm leading-relaxed">
                {finding.compensating_advantages}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recommended Action */}
      <div
        className={`flex items-start gap-3 rounded-xl border border-border p-5 ${
          finding.recommended_action === "Escalate"
            ? "border-destructive/30 bg-destructive/5"
            : finding.recommended_action === "Manual test recommended"
              ? "border-blue-500/30 bg-blue-500/5"
              : finding.recommended_action === "Flag to team"
                ? "border-orange-500/30 bg-orange-500/5"
                : ""
        }`}
      >
        <ActionIcon className={`h-5 w-5 mt-0.5 ${action.color}`} />
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {finding.recommended_action || "No action needed"}
          </p>
          {testingCriteria && (
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              {testingCriteria.what_to_test && (
                <div>
                  <p className="font-medium text-foreground">What to test</p>
                  <p>{testingCriteria.what_to_test}</p>
                </div>
              )}
              {testingCriteria.what_to_look_for && (
                <div>
                  <p className="font-medium text-foreground">
                    What to look for
                  </p>
                  <p>{testingCriteria.what_to_look_for}</p>
                </div>
              )}
              {testingCriteria.what_changes_assessment && (
                <div>
                  <p className="font-medium text-foreground">
                    What changes the assessment
                  </p>
                  <p>{testingCriteria.what_changes_assessment}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
