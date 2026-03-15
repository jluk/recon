import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchHackerNews } from "@/lib/sources/hackernews";
import { fetchReddit } from "@/lib/sources/reddit";
import { fetchYouTube } from "@/lib/sources/youtube";
import { analyzeCompetitor, type SourceData } from "@/lib/analyze";

const TEMP_USER_ID = "temp-local-user";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Map priority to default interval in days */
const PRIORITY_DEFAULTS: Record<string, number> = {
  Primary: 7,
  Secondary: 14,
  Watch: 30,
};

/** Map explicit schedule_frequency to interval in days */
const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

/**
 * Get the effective interval in days for a competitor.
 * "default" uses priority-based interval, "never" returns Infinity.
 */
export function getIntervalDays(
  scheduleFrequency: string,
  priority: string
): number {
  if (scheduleFrequency === "never") return Infinity;
  if (scheduleFrequency === "default") {
    return PRIORITY_DEFAULTS[priority] ?? 30;
  }
  return FREQUENCY_DAYS[scheduleFrequency] ?? 30;
}

/**
 * Determine which competitors are due for a scheduled run.
 * A competitor is due if it has never been run, or if the time since
 * its last completed run exceeds its schedule interval.
 */
export function isDue(
  lastRunAt: string | null,
  intervalDays: number,
  now: Date
): boolean {
  if (intervalDays === Infinity) return false;
  if (!lastRunAt) return true;
  const elapsed = now.getTime() - new Date(lastRunAt).getTime();
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  return elapsed >= intervalMs;
}

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const now = new Date();

  // 1. Load settings — bail if no API key configured
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", TEMP_USER_ID)
    .single();

  if (!settings?.gemini_api_key) {
    return NextResponse.json({
      skipped: true,
      reason: "No Gemini API key configured in settings",
    });
  }

  if (!settings.schedule_enabled) {
    return NextResponse.json({
      skipped: true,
      reason: "Scheduled runs are disabled",
    });
  }

  // 2. Load all competitors
  const { data: competitors, error: compError } = await supabase
    .from("competitors")
    .select("*")
    .eq("user_id", TEMP_USER_ID);

  if (compError || !competitors?.length) {
    return NextResponse.json({
      skipped: true,
      reason: compError ? compError.message : "No competitors configured",
    });
  }

  // 3. For each competitor, find their most recent completed run
  const { data: latestRuns } = await supabase
    .from("runs")
    .select("competitor_id, completed_at")
    .eq("user_id", TEMP_USER_ID)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  // Build a map of competitor_id -> most recent completed_at
  const lastRunMap = new Map<string, string>();
  for (const run of latestRuns ?? []) {
    if (!lastRunMap.has(run.competitor_id)) {
      lastRunMap.set(run.competitor_id, run.completed_at!);
    }
  }

  // 4. Filter to competitors that are due
  const dueCompetitors = competitors.filter((c) => {
    const intervalDays = getIntervalDays(
      c.schedule_frequency ?? "default",
      c.priority
    );
    return isDue(lastRunMap.get(c.id) ?? null, intervalDays, now);
  });

  if (dueCompetitors.length === 0) {
    return NextResponse.json({
      skipped: false,
      reason: "No competitors due for analysis",
      checked: competitors.length,
    });
  }

  // 5. Run analysis for each due competitor sequentially
  const activeSources: string[] = settings.enabled_sources ?? [
    "hackernews",
    "reddit",
    "youtube",
  ];
  const results: {
    competitor: string;
    findings_count: number;
    status: string;
    error?: string;
  }[] = [];

  for (const competitor of dueCompetitors) {
    let runId: string | null = null;

    try {
      // Create run record
      const { data: run, error: runError } = await supabase
        .from("runs")
        .insert({
          competitor_id: competitor.id,
          type: "scheduled",
          status: "running",
          user_id: TEMP_USER_ID,
        })
        .select()
        .single();

      if (runError || !run) {
        results.push({
          competitor: competitor.name,
          findings_count: 0,
          status: "failed",
          error: runError?.message ?? "Failed to create run",
        });
        continue;
      }

      runId = run.id as string;

      // Fetch sources
      const sourceData: SourceData = {};
      let sourcesUsed = 0;

      const fetches: Promise<{ key: string; result: unknown }>[] = [];

      if (activeSources.includes("hackernews")) {
        fetches.push(
          fetchHackerNews(competitor.name, 90).then((r) => ({
            key: "hn",
            result: r,
          }))
        );
      }
      if (activeSources.includes("reddit")) {
        fetches.push(
          fetchReddit(competitor.name, 90).then((r) => ({
            key: "reddit",
            result: r,
          }))
        );
      }
      if (activeSources.includes("youtube")) {
        fetches.push(
          fetchYouTube(competitor.name, settings.gemini_api_key, 90).then(
            (r) => ({ key: "youtube", result: r })
          )
        );
      }

      const fetchResults = await Promise.allSettled(fetches);

      for (const r of fetchResults) {
        if (r.status === "fulfilled") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (sourceData as any)[r.value.key] = r.value.result;
          sourcesUsed++;
        }
      }

      // Get existing claims to deduplicate
      const { data: existingRows } = await supabase
        .from("findings")
        .select("claim")
        .eq("competitor_id", competitor.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const existingClaims = (existingRows ?? []).map(
        (r: { claim: string }) => r.claim
      );

      // Analyze
      const analysis = await analyzeCompetitor(
        competitor.name,
        settings.product_name || "our product",
        settings.product_context || "",
        sourceData,
        settings.gemini_api_key,
        existingClaims
      );

      // Store findings
      const findingsToInsert = analysis.findings.map((f) => ({
        run_id: runId,
        competitor_id: competitor.id,
        claim: f.claim,
        reality: f.reality,
        confidence: f.confidence,
        threat_level: f.threat_level,
        sources: f.sources,
        why_it_matters: f.why_it_matters || "",
        user_segment_overlap: f.user_segment_overlap || "",
        compensating_advantages: f.compensating_advantages || "",
        recommended_action: f.recommended_action || "",
        testing_criteria: f.testing_criteria,
        user_id: TEMP_USER_ID,
      }));

      if (findingsToInsert.length > 0) {
        await supabase.from("findings").insert(findingsToInsert);
      }

      // Mark run complete
      await supabase
        .from("runs")
        .update({
          status: "completed",
          findings_count: analysis.findings.length,
          sources_used: sourcesUsed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);

      results.push({
        competitor: competitor.name,
        findings_count: analysis.findings.length,
        status: "completed",
      });
    } catch (error) {
      if (runId) {
        await supabase
          .from("runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", runId);
      }

      results.push({
        competitor: competitor.name,
        findings_count: 0,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    ran: results.length,
    total_competitors: competitors.length,
    results,
  });
}
