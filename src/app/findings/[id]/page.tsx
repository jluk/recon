import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckSquare } from "lucide-react";
import Link from "next/link";

const threatColors = {
  High: "destructive",
  Medium: "outline",
  Low: "secondary",
  Monitor: "ghost",
} as const;

export default async function FindingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Demo data — will be replaced with DB lookup
  const finding = {
    id,
    claim: "Gen-3 Alpha delivers 'cinematic quality' video generation",
    reality:
      "70% of Reddit reactions mention 4-second clip limit as a dealbreaker for professional workflows. Three G2 reviews this month specifically cite this as reason for churn. Runway's latest job postings show 2 new roles for 'long-form video research.'",
    confidence: "Medium" as const,
    threatLevel: "High" as const,
    competitor: "RunwayML",
    sources: ["Reddit r/VideoEditing", "G2 Reviews", "HN Discussion"],
    date: "2024-12-15",
    whyItMatters:
      "Runway is positioning Gen-3 as professional-grade, but clip duration limits prevent use in any workflow requiring continuity — explainer videos, training content, marketing videos. This directly overlaps with Vids' core use case of creating workplace videos from Docs/Slides outlines.",
    userSegmentOverlap:
      "Marketing teams and L&D creators who need videos longer than 10 seconds — essentially all enterprise Vids users.",
    compensatingAdvantages:
      "Vids generates full-length videos from existing Workspace content (Docs, Slides). No clip-stitching required. Enterprise security, Drive integration, and Google Meet embedding are table stakes for Vids' target users that Runway doesn't address.",
    recommendedAction: "Manual test recommended" as const,
    testingCriteria: {
      whatToTest:
        "Generate a 60-second explainer video from a Google Doc outline using Runway Gen-3 Alpha.",
      whatToLookFor:
        "Does output quality hold up past 4 seconds? Is there visible quality degradation at 30+ seconds? Is there a watermark on free tier?",
      whatChangesAssessment:
        "If quality matches the demo at 60 seconds, threat level upgrades to High with High Confidence. If 4-second limit is real, current assessment holds.",
    },
  };

  return (
    <div className="space-y-6">
      <Link
        href="/findings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Findings
      </Link>

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={threatColors[finding.threatLevel]}>
              {finding.threatLevel} Threat
            </Badge>
            <Badge variant="outline">{finding.confidence} Confidence</Badge>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            {finding.competitor}: {finding.claim}
          </h1>
          <p className="text-sm text-muted-foreground">{finding.date}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                CLAIM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{finding.claim}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                REALITY
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{finding.reality}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                IMPLICATION FOR VIDS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  WHY IT MATTERS
                </p>
                <p className="mt-1 text-sm">{finding.whyItMatters}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  USER SEGMENT OVERLAP
                </p>
                <p className="mt-1 text-sm">{finding.userSegmentOverlap}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  VIDS COMPENSATING ADVANTAGES
                </p>
                <p className="mt-1 text-sm">
                  {finding.compensatingAdvantages}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                SOURCES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {finding.sources.map((source) => (
                  <div
                    key={source}
                    className="rounded bg-secondary px-3 py-2 text-sm"
                  >
                    {source}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                RECOMMENDED ACTION
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {finding.recommendedAction}
                </span>
              </div>
              {finding.testingCriteria && (
                <div className="space-y-3 rounded-lg bg-secondary p-4">
                  <div>
                    <p className="text-xs font-medium">What to test</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {finding.testingCriteria.whatToTest}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">What to look for</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {finding.testingCriteria.whatToLookFor}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">
                      What changes assessment
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {finding.testingCriteria.whatChangesAssessment}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
