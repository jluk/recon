import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeCompetitor, type SourceData, type Finding } from "./analyze";

// Shared mock for generateContent
const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

const sampleFindings: Finding[] = [
  {
    claim: "Competitor claims real-time collaboration",
    reality: "Users report 3-5 second lag on HN and Reddit",
    confidence: "High",
    threat_level: "Medium",
    sources: ["HN comment by user1", "Reddit r/artificial post"],
    why_it_matters: "Our real-time editing is a key differentiator",
    user_segment_overlap: "Teams using collaborative editing",
    compensating_advantages: "Our latency is under 100ms",
    recommended_action: "Flag to team",
    testing_criteria: null,
  },
];

const sampleSourceData: SourceData = {
  hn: {
    source: "hackernews",
    queries: ["Competitor"],
    stories: [
      {
        id: "1",
        title: "Competitor launches new feature",
        url: "https://example.com",
        author: "hn_user",
        points: 150,
        numComments: 30,
        createdAt: "2025-06-01T00:00:00Z",
      },
    ],
    comments: [
      {
        id: "c1",
        text: "Their collaboration feature is laggy",
        author: "dev_user",
        storyTitle: "Competitor launches new feature",
        createdAt: "2025-06-01T01:00:00Z",
      },
    ],
    fetchedAt: new Date().toISOString(),
  },
  reddit: {
    source: "reddit",
    queries: ["Competitor"],
    subreddits: ["artificial"],
    posts: [
      {
        id: "r1",
        title: "Competitor review",
        selftext: "Real-time collab has noticeable delay",
        author: "redditor",
        score: 45,
        numComments: 12,
        subreddit: "artificial",
        url: "https://reddit.com/r/artificial/test",
        createdAt: "2025-06-02T00:00:00Z",
      },
    ],
    comments: [],
    fetchedAt: new Date().toISOString(),
  },
};

describe("analyzeCompetitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns findings from a valid JSON array response", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleFindings),
    });

    const result = await analyzeCompetitor(
      "Competitor",
      "OurProduct",
      "We build collaborative tools",
      sampleSourceData,
      "fake-api-key"
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].claim).toBe("Competitor claims real-time collaboration");
    expect(result.raw_response).toBeDefined();
  });

  it("extracts JSON array from markdown-wrapped response", async () => {
    const wrappedResponse = `Here are the findings:\n\`\`\`json\n${JSON.stringify(sampleFindings)}\n\`\`\``;
    mockGenerateContent.mockResolvedValue({ text: wrappedResponse });

    const result = await analyzeCompetitor(
      "Competitor",
      "OurProduct",
      "context",
      sampleSourceData,
      "fake-api-key"
    );

    expect(result.findings).toHaveLength(1);
  });

  it("returns empty findings for completely unparseable response", async () => {
    mockGenerateContent.mockResolvedValue({ text: "I cannot analyze this data properly." });

    const result = await analyzeCompetitor(
      "Competitor",
      "OurProduct",
      "context",
      sampleSourceData,
      "fake-api-key"
    );

    expect(result.findings).toEqual([]);
  });

  it("returns empty findings when response is empty string", async () => {
    mockGenerateContent.mockResolvedValue({ text: "" });

    const result = await analyzeCompetitor(
      "Competitor",
      "OurProduct",
      "context",
      sampleSourceData,
      "fake-api-key"
    );

    expect(result.findings).toEqual([]);
  });

  it("handles null text in response", async () => {
    mockGenerateContent.mockResolvedValue({ text: null });

    const result = await analyzeCompetitor(
      "Competitor",
      "OurProduct",
      "context",
      sampleSourceData,
      "fake-api-key"
    );

    expect(result.findings).toEqual([]);
    expect(result.raw_response).toBe("");
  });

  it("passes existing findings to avoid duplicates", async () => {
    mockGenerateContent.mockResolvedValue({ text: "[]" });

    await analyzeCompetitor(
      "Competitor",
      "OurProduct",
      "context",
      sampleSourceData,
      "fake-api-key",
      ["Existing claim A", "Existing claim B"]
    );

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents).toContain("Existing claim A");
    expect(callArgs.contents).toContain("Existing claim B");
  });

  it("includes all provided sources in the prompt", async () => {
    mockGenerateContent.mockResolvedValue({ text: "[]" });

    const fullSourceData: SourceData = {
      ...sampleSourceData,
      youtube: {
        source: "youtube",
        queries: ["Competitor"],
        videos: [
          {
            id: "yt1",
            title: "Competitor Review",
            channelTitle: "TechReview",
            publishedAt: "2025-06-01T00:00:00Z",
            viewCount: "50000",
            commentCount: "100",
          },
        ],
        comments: [],
        fetchedAt: new Date().toISOString(),
      },
    };

    await analyzeCompetitor(
      "Competitor",
      "OurProduct",
      "context",
      fullSourceData,
      "fake-api-key"
    );

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents).toContain("Hacker News");
    expect(callArgs.contents).toContain("Reddit");
    expect(callArgs.contents).toContain("YouTube");
  });

  it("handles source data with only one source", async () => {
    mockGenerateContent.mockResolvedValue({ text: "[]" });

    await analyzeCompetitor(
      "Competitor",
      "OurProduct",
      "context",
      { hn: sampleSourceData.hn },
      "fake-api-key"
    );

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents).toContain("Hacker News");
    // "Reddit" appears in rules text, so check that no Reddit section header is present
    expect(callArgs.contents).not.toContain("## Reddit");
  });

  it("handles non-array JSON response", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ error: "not an array" }),
    });

    const result = await analyzeCompetitor(
      "Competitor",
      "OurProduct",
      "context",
      sampleSourceData,
      "fake-api-key"
    );

    expect(result.findings).toEqual([]);
  });
});
