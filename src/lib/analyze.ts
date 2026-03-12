import { GoogleGenAI } from "@google/genai";
import type { HNResult } from "./sources/hackernews";
import type { RedditResult } from "./sources/reddit";
import type { YouTubeResult } from "./sources/youtube";

export interface Finding {
  claim: string;
  reality: string;
  confidence: "High" | "Medium" | "Low";
  threat_level: "High" | "Medium" | "Low" | "Monitor";
  sources: string[];
  why_it_matters: string;
  user_segment_overlap: string;
  compensating_advantages: string;
  recommended_action: string;
  testing_criteria: {
    what_to_test: string;
    what_to_look_for: string;
    what_changes_assessment: string;
  } | null;
}

export interface AnalysisResult {
  findings: Finding[];
  raw_response: string;
}

export interface SourceData {
  hn?: HNResult;
  reddit?: RedditResult;
  youtube?: YouTubeResult;
}

function formatHNData(hn: HNResult): string {
  let output = `## Hacker News (queries: ${hn.queries.map(q => `"${q}"`).join(", ")})\n\n`;

  if (hn.stories.length > 0) {
    output += `### Stories (${hn.stories.length})\n`;
    for (const story of hn.stories) {
      output += `- "${story.title}" by ${story.author} (${story.points} points, ${story.numComments} comments, ${story.createdAt})\n`;
    }
    output += "\n";
  }

  if (hn.comments.length > 0) {
    output += `### Comments (${hn.comments.length})\n`;
    for (const comment of hn.comments) {
      output += `- [${comment.storyTitle}] ${comment.author}: "${comment.text.slice(0, 500)}"\n\n`;
    }
  }

  return output;
}

function formatRedditData(reddit: RedditResult): string {
  let output = `## Reddit (subreddits: ${reddit.subreddits.join(", ")})\n\n`;

  if (reddit.posts.length > 0) {
    output += `### Posts (${reddit.posts.length})\n`;
    for (const post of reddit.posts) {
      output += `- r/${post.subreddit}: "${post.title}" by ${post.author} (${post.score} upvotes, ${post.numComments} comments)\n`;
      if (post.selftext) {
        output += `  Text: "${post.selftext.slice(0, 300)}"\n`;
      }
    }
    output += "\n";
  }

  if (reddit.comments.length > 0) {
    output += `### Comments (${reddit.comments.length})\n`;
    for (const comment of reddit.comments) {
      output += `- r/${comment.subreddit} [${comment.postTitle}] ${comment.author} (${comment.score} pts): "${comment.body.slice(0, 400)}"\n\n`;
    }
  }

  return output;
}

function formatYouTubeData(yt: YouTubeResult): string {
  let output = `## YouTube\n\n`;

  if (yt.videos.length > 0) {
    output += `### Videos (${yt.videos.length})\n`;
    for (const video of yt.videos) {
      output += `- "${video.title}" by ${video.channelTitle} (${video.viewCount} views, ${video.commentCount} comments, ${video.publishedAt})\n`;
    }
    output += "\n";
  }

  if (yt.comments.length > 0) {
    output += `### Comments (${yt.comments.length})\n`;
    for (const comment of yt.comments) {
      output += `- [${comment.videoTitle}] ${comment.author} (${comment.likeCount} likes): "${comment.text.slice(0, 400)}"\n\n`;
    }
  }

  return output;
}

export async function analyzeCompetitor(
  competitorName: string,
  productName: string,
  productContext: string,
  sourceData: SourceData,
  apiKey: string,
  existingFindings?: string[]
): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey });

  let formattedSources = "";
  if (sourceData.hn) formattedSources += formatHNData(sourceData.hn) + "\n---\n\n";
  if (sourceData.reddit) formattedSources += formatRedditData(sourceData.reddit) + "\n---\n\n";
  if (sourceData.youtube) formattedSources += formatYouTubeData(sourceData.youtube) + "\n---\n\n";

  const sourceNames: string[] = [];
  if (sourceData.hn) sourceNames.push("Hacker News");
  if (sourceData.reddit) sourceNames.push("Reddit");
  if (sourceData.youtube) sourceNames.push("YouTube");

  let existingFindingsBlock = "";
  if (existingFindings && existingFindings.length > 0) {
    existingFindingsBlock = `\n## Existing findings (DO NOT repeat these — find NEW insights)\n${existingFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n`;
  }

  const prompt = `You are a competitive intelligence analyst. Your job is to analyze raw data about ${competitorName} and produce structured findings for the ${productName} team.

## Your product context
${productContext}

## Available sources
Data was collected from: ${sourceNames.join(", ")}
${existingFindingsBlock}
## Rules
- Return AT MOST 5 findings, prioritized by threat level and confidence. Quality over quantity.
- Only surface findings corroborated by at least 2 independent data points from DIFFERENT sources or different users (e.g. an HN comment + a Reddit post, or two Reddit comments from different users in different threads)
- Cross-source corroboration is the strongest signal: if HN users AND Reddit users AND YouTube commenters all say the same thing, that's high confidence
- Never summarize press releases or marketing copy back — find the GAP between claims and reality
- Be specific: name the exact ${productName} feature or gap affected
- If you cannot find findings that meet the 2-source minimum, return an empty findings array — that is better than fabricating weak findings
- Weight HN comments highly — they are technically sophisticated with zero sponsored content
- Consolidate related data points into a single finding rather than creating separate findings for each mention. If multiple users say the same thing, that strengthens ONE finding — it does not create multiple findings.

## Source data
${formattedSources}

## Output format
Return a JSON array of findings. Each finding must have this exact structure:
{
  "claim": "What ${competitorName} publicly states or implies",
  "reality": "What users/data actually show — be specific, cite the sources",
  "confidence": "High | Medium | Low",
  "threat_level": "High | Medium | Low | Monitor",
  "sources": ["source 1 description", "source 2 description"],
  "why_it_matters": "2-3 concrete sentences. Name the specific ${productName} feature or gap this affects.",
  "user_segment_overlap": "Which ${productName} users are most at risk",
  "compensating_advantages": "What ${productName} has that ${competitorName} doesn't, relevant to this finding",
  "recommended_action": "No action needed | Flag to team | Manual test recommended | Escalate",
  "testing_criteria": null or { "what_to_test": "...", "what_to_look_for": "...", "what_changes_assessment": "..." }
}

testing_criteria should only be non-null when recommended_action is "Manual test recommended" AND:
1. Confidence is Medium or High
2. Threat level is High or Medium
3. The capability is testable in under 30 minutes

Return ONLY valid JSON. No markdown, no explanation. Just the array.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const responseText = response.text ?? "";

  let findings: Finding[] = [];
  try {
    const parsed = JSON.parse(responseText);
    findings = Array.isArray(parsed) ? parsed : [];
  } catch {
    const match = responseText.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        findings = JSON.parse(match[0]);
      } catch {
        console.error("Failed to parse analysis response");
      }
    }
  }

  return {
    findings,
    raw_response: responseText,
  };
}
