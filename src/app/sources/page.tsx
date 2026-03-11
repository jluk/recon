"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Globe,
  FileText,
  MessageSquare,
  Star,
  Briefcase,
  Youtube,
  Rocket,
  Twitter,
} from "lucide-react";

interface Source {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  status: "active" | "configured" | "needs-setup" | "roadmap";
  method: string;
  tier: "v1" | "roadmap";
}

const initialSources: Source[] = [
  {
    id: "website",
    name: "Website & Marketing Pages",
    description: "Scrape + diff against last snapshot. Track claim language and positioning shifts.",
    icon: Globe,
    enabled: true,
    status: "needs-setup",
    method: "Scrape + diff",
    tier: "v1",
  },
  {
    id: "changelog",
    name: "Changelog",
    description: "What actually shipped vs. what was announced.",
    icon: FileText,
    enabled: true,
    status: "needs-setup",
    method: "Scrape + diff",
    tier: "v1",
  },
  {
    id: "hackernews",
    name: "Hacker News",
    description: "Technical user reactions, zero sponsored content. Highest quality community signal.",
    icon: MessageSquare,
    enabled: true,
    status: "needs-setup",
    method: "Algolia API (free)",
    tier: "v1",
  },
  {
    id: "g2",
    name: "G2 / Capterra Reviews",
    description: "Filter for friction language: 'but', 'however', 'wish', 'limitation'.",
    icon: Star,
    enabled: true,
    status: "needs-setup",
    method: "Scrape",
    tier: "v1",
  },
  {
    id: "reddit",
    name: "Reddit",
    description: "r/VideoEditing, r/artificial — community sentiment, unfiltered friction.",
    icon: MessageSquare,
    enabled: true,
    status: "needs-setup",
    method: "Reddit API (free)",
    tier: "v1",
  },
  {
    id: "youtube",
    name: "YouTube Comments",
    description: "Unfiltered reactions from actual target users on demo videos.",
    icon: Youtube,
    enabled: true,
    status: "needs-setup",
    method: "YouTube Data API (free)",
    tier: "v1",
  },
  {
    id: "producthunt",
    name: "Product Hunt",
    description: "Launch-day sentiment, structured reviews.",
    icon: Rocket,
    enabled: true,
    status: "needs-setup",
    method: "Free API",
    tier: "v1",
  },
  {
    id: "linkedin",
    name: "LinkedIn Jobs & Company",
    description: "Role, seniority, volume — leading indicator of strategic investment.",
    icon: Briefcase,
    enabled: false,
    status: "needs-setup",
    method: "py-linkedin-jobs-scraper",
    tier: "v1",
  },
  {
    id: "twitter",
    name: "Twitter / X",
    description: "Highest volume signal source. Deferred due to $100/mo API cost.",
    icon: Twitter,
    enabled: false,
    status: "roadmap",
    method: "$100/mo API",
    tier: "roadmap",
  },
];

const statusLabel = {
  active: { label: "Active", variant: "default" as const },
  configured: { label: "Configured", variant: "outline" as const },
  "needs-setup": { label: "Needs Setup", variant: "secondary" as const },
  roadmap: { label: "Roadmap", variant: "ghost" as const },
};

export default function SourcesPage() {
  const [sources, setSources] = useState(initialSources);

  function toggleSource(id: string) {
    setSources(
      sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  }

  const v1Sources = sources.filter((s) => s.tier === "v1");
  const roadmapSources = sources.filter((s) => s.tier === "roadmap");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sources</h1>
        <p className="text-muted-foreground">
          Data sources used for competitive intelligence
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">V1 Sources</h2>
        <div className="grid gap-3">
          {v1Sources.map((source) => (
            <Card key={source.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <source.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{source.name}</p>
                      <Badge variant={statusLabel[source.status].variant}>
                        {statusLabel[source.status].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {source.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Method: {source.method}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                  <Switch
                    checked={source.enabled}
                    onCheckedChange={() => toggleSource(source.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Roadmap</h2>
        <div className="grid gap-3">
          {roadmapSources.map((source) => (
            <Card key={source.id} className="opacity-60">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <source.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{source.name}</p>
                      <Badge variant="ghost">Roadmap</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {source.description}
                    </p>
                  </div>
                </div>
                <Switch checked={false} disabled />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
