import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchHackerNews } from "@/lib/sources/hackernews";
import { fetchReddit } from "@/lib/sources/reddit";
import { fetchYouTube } from "@/lib/sources/youtube";
import { analyzeCompetitor, type SourceData } from "@/lib/analyze";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  let runId: string | null = null;

  try {
    const body = await req.json();
    const {
      competitor_id,
      competitor_name,
      product_name,
      product_context,
      gemini_api_key,
      enabled_sources,
    } = body;

    const activeSources: string[] = enabled_sources ?? ["hackernews", "reddit", "youtube"];

    if (!competitor_id || !competitor_name || !gemini_api_key) {
      return NextResponse.json(
        { error: "Missing required fields: competitor_id, competitor_name, gemini_api_key" },
        { status: 400 }
      );
    }

    // 1. Create the run record
    const { data: run, error: runError } = await supabase
      .from("runs")
      .insert({
        competitor_id,
        type: "manual",
        status: "running",
        user_id: "temp-local-user",
      })
      .select()
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: "Failed to create run", details: runError?.message },
        { status: 500 }
      );
    }

    runId = run.id as string;

    // 2. Fetch enabled sources in parallel
    const sourceData: SourceData = {};
    let sourcesUsed = 0;

    const fetches: Promise<{ key: string; result: unknown }>[] = [];

    if (activeSources.includes("hackernews")) {
      fetches.push(
        fetchHackerNews(competitor_name, 90).then((r) => ({ key: "hn", result: r }))
      );
    }
    if (activeSources.includes("reddit")) {
      fetches.push(
        fetchReddit(competitor_name, 90).then((r) => ({ key: "reddit", result: r }))
      );
    }
    if (activeSources.includes("youtube")) {
      fetches.push(
        fetchYouTube(competitor_name, gemini_api_key, 90).then((r) => ({ key: "youtube", result: r }))
      );
    }

    const results = await Promise.allSettled(fetches);

    for (const r of results) {
      if (r.status === "fulfilled") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sourceData as any)[r.value.key] = r.value.result;
        sourcesUsed++;
      } else {
        console.error("Source fetch failed:", r.reason);
      }
    }

    // 3. Run Gemini analysis
    const analysis = await analyzeCompetitor(
      competitor_name,
      product_name || "our product",
      product_context || "",
      sourceData,
      gemini_api_key
    );

    // 4. Store findings
    const findingsToInsert = analysis.findings.map((f) => ({
      run_id: runId,
      competitor_id,
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
      user_id: "temp-local-user",
    }));

    if (findingsToInsert.length > 0) {
      const { error: findingsError } = await supabase
        .from("findings")
        .insert(findingsToInsert);

      if (findingsError) {
        console.error("Failed to store findings:", findingsError);
      }
    }

    // 5. Update run status to completed
    await supabase
      .from("runs")
      .update({
        status: "completed",
        findings_count: analysis.findings.length,
        sources_used: sourcesUsed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return NextResponse.json({
      run_id: runId,
      findings_count: analysis.findings.length,
      sources_used: sourcesUsed,
      findings: analysis.findings,
      debug: {
        hn_stories: sourceData.hn?.stories.length ?? 0,
        hn_comments: sourceData.hn?.comments.length ?? 0,
        reddit_posts: sourceData.reddit?.posts.length ?? 0,
        reddit_comments: sourceData.reddit?.comments.length ?? 0,
        youtube_videos: sourceData.youtube?.videos.length ?? 0,
        youtube_comments: sourceData.youtube?.comments.length ?? 0,
        raw_response_preview: analysis.raw_response.slice(0, 500),
      },
    });
  } catch (error) {
    console.error("Run failed:", error);

    if (runId) {
      await supabase
        .from("runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }

    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: `Run failed: ${message}` },
      { status: 500 }
    );
  }
}
