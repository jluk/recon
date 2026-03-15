import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// Mock Supabase
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock source fetchers
vi.mock("@/lib/sources/hackernews", () => ({
  fetchHackerNews: vi.fn().mockResolvedValue({
    source: "hackernews",
    queries: ["Test"],
    stories: [],
    comments: [],
    fetchedAt: new Date().toISOString(),
  }),
}));

vi.mock("@/lib/sources/reddit", () => ({
  fetchReddit: vi.fn().mockResolvedValue({
    source: "reddit",
    queries: ["Test"],
    subreddits: [],
    posts: [],
    comments: [],
    fetchedAt: new Date().toISOString(),
  }),
}));

vi.mock("@/lib/sources/youtube", () => ({
  fetchYouTube: vi.fn().mockResolvedValue({
    source: "youtube",
    queries: ["Test"],
    videos: [],
    comments: [],
    fetchedAt: new Date().toISOString(),
  }),
}));

// Mock analyzer
vi.mock("@/lib/analyze", () => ({
  analyzeCompetitor: vi.fn().mockResolvedValue({
    findings: [
      {
        claim: "Test claim",
        reality: "Test reality",
        confidence: "High",
        threat_level: "Medium",
        sources: ["HN", "Reddit"],
        why_it_matters: "Important",
        user_segment_overlap: "All users",
        compensating_advantages: "Our strength",
        recommended_action: "Flag to team",
        testing_criteria: null,
      },
    ],
    raw_response: "[]",
  }),
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupSupabaseMocks(overrides?: {
  runInsertError?: boolean;
  findingsInsertError?: boolean;
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "runs") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              overrides?.runInsertError
                ? { data: null, error: { message: "Insert failed" } }
                : { data: { id: "run-123" }, error: null }
            ),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === "findings") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          error: overrides?.findingsInsertError
            ? { message: "Insert failed" }
            : null,
        }),
      };
    }
    return {};
  });
}

describe("POST /api/run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    const req = makeRequest({ competitor_id: "123" });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Missing required fields");
  });

  it("returns 400 when competitor_name is missing", async () => {
    const req = makeRequest({
      competitor_id: "123",
      gemini_api_key: "key",
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
  });

  it("returns 400 when gemini_api_key is missing", async () => {
    const req = makeRequest({
      competitor_id: "123",
      competitor_name: "Test",
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
  });

  it("returns 500 when run creation fails", async () => {
    setupSupabaseMocks({ runInsertError: true });

    const req = makeRequest({
      competitor_id: "123",
      competitor_name: "TestCo",
      gemini_api_key: "fake-key",
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain("Failed to create run");
  });

  it("returns successful response with findings", async () => {
    const req = makeRequest({
      competitor_id: "123",
      competitor_name: "TestCo",
      product_name: "OurProduct",
      product_context: "We do stuff",
      gemini_api_key: "fake-key",
    });

    const res = await POST(req as unknown as import("next/server").NextRequest);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.run_id).toBe("run-123");
    expect(json.findings_count).toBe(1);
    expect(json.findings[0].claim).toBe("Test claim");
    expect(json.debug).toBeDefined();
  });

  it("respects enabled_sources parameter", async () => {
    const { fetchHackerNews } = await import("@/lib/sources/hackernews");
    const { fetchReddit } = await import("@/lib/sources/reddit");
    const { fetchYouTube } = await import("@/lib/sources/youtube");

    const req = makeRequest({
      competitor_id: "123",
      competitor_name: "TestCo",
      gemini_api_key: "fake-key",
      enabled_sources: ["hackernews"],
    });

    await POST(req as unknown as import("next/server").NextRequest);

    expect(fetchHackerNews).toHaveBeenCalled();
    expect(fetchReddit).not.toHaveBeenCalled();
    expect(fetchYouTube).not.toHaveBeenCalled();
  });

  it("defaults product_name to 'our product' when not provided", async () => {
    const { analyzeCompetitor } = await import("@/lib/analyze");

    const req = makeRequest({
      competitor_id: "123",
      competitor_name: "TestCo",
      gemini_api_key: "fake-key",
    });

    await POST(req as unknown as import("next/server").NextRequest);

    expect(analyzeCompetitor).toHaveBeenCalledWith(
      "TestCo",
      "our product",
      "",
      expect.any(Object),
      "fake-key",
      expect.any(Array)
    );
  });

  it("includes debug info in response", async () => {
    const req = makeRequest({
      competitor_id: "123",
      competitor_name: "TestCo",
      gemini_api_key: "fake-key",
    });

    const res = await POST(req as unknown as import("next/server").NextRequest);
    const json = await res.json();

    expect(json.debug).toHaveProperty("hn_stories");
    expect(json.debug).toHaveProperty("reddit_posts");
    expect(json.debug).toHaveProperty("youtube_videos");
    expect(json.debug).toHaveProperty("raw_response_preview");
  });
});
