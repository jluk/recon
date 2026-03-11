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
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const stats = [
  {
    label: "Competitors Tracked",
    value: "1",
    icon: Target,
    change: null,
  },
  {
    label: "Active Sources",
    value: "7",
    icon: TrendingUp,
    change: null,
  },
  {
    label: "Open Findings",
    value: "—",
    icon: AlertTriangle,
    change: "No runs yet",
  },
  {
    label: "Last Run",
    value: "—",
    icon: Clock,
    change: "Not configured",
  },
];

const recentFindings = [
  {
    id: "demo-1",
    claim: "Gen-3 Alpha delivers 'cinematic quality' video generation",
    competitor: "RunwayML",
    threatLevel: "High" as const,
    confidence: "Medium" as const,
    date: "Demo",
  },
  {
    id: "demo-2",
    claim: "Enterprise-ready collaboration features",
    competitor: "RunwayML",
    threatLevel: "Low" as const,
    confidence: "Low" as const,
    date: "Demo",
  },
];

const threatColors = {
  High: "destructive",
  Medium: "outline",
  Low: "secondary",
  Monitor: "ghost",
} as const;

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Competitive intelligence overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">
                {stat.label}
              </CardDescription>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change && (
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Findings</CardTitle>
            <CardDescription>
              Latest claim vs. reality gaps detected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentFindings.map((finding) => (
              <div
                key={finding.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-snug">
                    {finding.claim}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {finding.competitor} &middot; {finding.date}
                  </p>
                </div>
                <Badge variant={threatColors[finding.threatLevel]}>
                  {finding.threatLevel}
                </Badge>
              </div>
            ))}
            <Link
              href="/findings"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all findings <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/competitors"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
            >
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Add a Competitor</p>
                <p className="text-xs text-muted-foreground">
                  Set up monitoring for a new company
                </p>
              </div>
            </Link>
            <Link
              href="/sources"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
            >
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Configure Sources</p>
                <p className="text-xs text-muted-foreground">
                  Add or adjust data sources for each competitor
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Run Analysis
                </p>
                <p className="text-xs text-muted-foreground">
                  Available after configuring sources
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
