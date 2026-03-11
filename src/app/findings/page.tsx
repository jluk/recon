"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ChevronRight, Filter } from "lucide-react";

interface Finding {
  id: string;
  claim: string;
  reality: string;
  confidence: "High" | "Medium" | "Low";
  threatLevel: "High" | "Medium" | "Low" | "Monitor";
  competitor: string;
  sources: string[];
  date: string;
  recommendedAction: string;
}

const demoFindings: Finding[] = [
  {
    id: "f-001",
    claim: "Gen-3 Alpha delivers 'cinematic quality' video generation",
    reality:
      "70% of Reddit reactions mention 4-second clip limit as a dealbreaker for professional workflows. Three G2 reviews this month cite this as reason for churn.",
    confidence: "Medium",
    threatLevel: "High",
    competitor: "RunwayML",
    sources: ["Reddit r/VideoEditing", "G2 Reviews", "HN Discussion"],
    date: "2024-12-15",
    recommendedAction: "Manual test recommended",
  },
  {
    id: "f-002",
    claim: "Enterprise-ready collaboration features",
    reality:
      "No mentions of collaboration features in any user review. LinkedIn postings show 0 enterprise sales roles. Product Hunt reviews focus exclusively on solo creator workflows.",
    confidence: "High",
    threatLevel: "Low",
    competitor: "RunwayML",
    sources: ["Product Hunt", "LinkedIn Jobs"],
    date: "2024-12-15",
    recommendedAction: "No action needed",
  },
  {
    id: "f-003",
    claim: "New pricing makes Runway accessible for teams",
    reality:
      "HN thread with 200+ comments highlights that per-seat pricing is 3x higher than comparable tools. G2 reviewers flag cost as top concern.",
    confidence: "Medium",
    threatLevel: "Medium",
    competitor: "RunwayML",
    sources: ["HN Algolia", "G2 Reviews"],
    date: "2024-12-10",
    recommendedAction: "Flag to team",
  },
];

const threatColors = {
  High: "destructive",
  Medium: "outline",
  Low: "secondary",
  Monitor: "ghost",
} as const;

const confidenceColors = {
  High: "default",
  Medium: "outline",
  Low: "secondary",
} as const;

export default function FindingsPage() {
  const [threatFilter, setThreatFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");

  const filtered = demoFindings.filter((f) => {
    if (threatFilter !== "all" && f.threatLevel !== threatFilter) return false;
    if (confidenceFilter !== "all" && f.confidence !== confidenceFilter)
      return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Findings</h1>
        <p className="text-muted-foreground">
          Claim vs. reality gaps across all competitors
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={threatFilter} onValueChange={(v) => setThreatFilter(v ?? "all")}>
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
        <Select value={confidenceFilter} onValueChange={(v) => setConfidenceFilter(v ?? "all")}>
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

      <div className="space-y-4">
        {filtered.map((finding) => (
          <Link key={finding.id} href={`/findings/${finding.id}`}>
            <Card className="transition-colors hover:bg-secondary/30">
              <CardContent className="py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={threatColors[finding.threatLevel]}>
                        {finding.threatLevel} Threat
                      </Badge>
                      <Badge variant={confidenceColors[finding.confidence]}>
                        {finding.confidence} Confidence
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {finding.competitor}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        CLAIM: {finding.claim}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        REALITY: {finding.reality}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex flex-wrap gap-1">
                        {finding.sources.map((source) => (
                          <span
                            key={source}
                            className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-xs text-muted-foreground">
                        {finding.date}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No findings match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
