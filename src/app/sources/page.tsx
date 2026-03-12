"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare,
  Youtube,
  Twitter,
  Globe,
  Star,
} from "lucide-react";

interface Source {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  method: string;
  tier: "active" | "roadmap";
  storageKey: string;
}

const sources: Source[] = [
  {
    id: "hackernews",
    name: "Hacker News",
    description:
      "Technical user reactions via Algolia API. Fuzzy name matching across stories and comments. 90-day window.",
    icon: MessageSquare,
    method: "Algolia API (free, no auth)",
    tier: "active",
    storageKey: "recon_source_hackernews",
  },
  {
    id: "reddit",
    name: "Reddit",
    description:
      "Community sentiment from 6 subreddits: VideoEditing, artificial, StableDiffusion, aivideo, filmmakers, vfx. Rate-limited.",
    icon: MessageSquare,
    method: "Public JSON endpoints (free, no auth)",
    tier: "active",
    storageKey: "recon_source_reddit",
  },
  {
    id: "youtube",
    name: "YouTube",
    description:
      "Search videos, fetch stats and top comments from top 5 results by view count. Uses your Google API key.",
    icon: Youtube,
    method: "YouTube Data API (uses Gemini API key)",
    tier: "active",
    storageKey: "recon_source_youtube",
  },
];

const roadmapSources = [
  {
    id: "twitter",
    name: "Twitter / X",
    description:
      "Highest volume signal source. Deferred due to $100/mo API cost.",
    icon: Twitter,
  },
  {
    id: "g2",
    name: "G2 / Capterra Reviews",
    description:
      "Structured user reviews with friction language filtering. Needs scraping feasibility research.",
    icon: Star,
  },
  {
    id: "website",
    name: "Website & Changelog Diffs",
    description:
      "Track positioning shifts and feature launches via automated page diffing.",
    icon: Globe,
  },
];

export default function SourcesPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const state: Record<string, boolean> = {};
    for (const source of sources) {
      const stored = localStorage.getItem(source.storageKey);
      state[source.id] = stored === null ? true : stored === "true";
    }
    setEnabled(state);
    setLoaded(true);
  }, []);

  function toggle(source: Source) {
    const next = !enabled[source.id];
    setEnabled((prev) => ({ ...prev, [source.id]: next }));
    localStorage.setItem(source.storageKey, String(next));
  }

  if (!loaded) return null;

  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sources</h1>
        <p className="text-muted-foreground">
          {enabledCount} of {sources.length} sources enabled for analysis runs
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Active Sources
        </h2>
        <div className="grid gap-3">
          {sources.map((source) => (
            <Card key={source.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <source.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{source.name}</p>
                      <Badge variant={enabled[source.id] ? "default" : "secondary"}>
                        {enabled[source.id] ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {source.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {source.method}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enabled[source.id] ?? true}
                  onCheckedChange={() => toggle(source)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Roadmap
        </h2>
        <div className="grid gap-3">
          {roadmapSources.map((source) => (
            <Card key={source.id} className="opacity-50">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <source.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{source.name}</p>
                      <Badge variant="outline">Roadmap</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
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
