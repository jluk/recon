import { describe, it, expect, vi, beforeEach } from "vitest";
import { getIntervalDays, isDue, GET } from "./route";
import type { NextRequest } from "next/server";

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
        user_segment_overlap: "All",
        compensating_advantages: "Ours",
        recommended_action: "Watch",
        testing_criteria: null,
      },
    ],
    raw_response: "[]",
  }),
}));

function makeRequest(headers?: Record<string, string>) {
  return {
    headers: {
      get: (name: string) => headers?.[name] ?? null,
    },
  } as unknown as NextRequest;
}

// Helper to set up Supabase mock chain
function setupMocks(opts: {
  settings?: Record<string, unknown> | null;
  settingsError?: boolean;
  competitors?: Record<string, unknown>[];
  latestRuns?: { competitor_id: string; completed_at: string }[];
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "settings") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              opts.settingsError
                ? { data: null, error: { code: "PGRST116", message: "Not found" } }
                : { data: opts.settings ?? null, error: opts.settings ? null : { code: "PGRST116" } }
            ),
          }),
        }),
      };
    }
    if (table === "competitors") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: opts.competitors ?? [],
            error: null,
          }),
        }),
      };
    }
    if (table === "runs") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: opts.latestRuns ?? [],
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "run-abc" },
              error: null,
            }),
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
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return {};
  });
}

describe("getIntervalDays", () => {
  it("returns priority-based default for 'default' frequency", () => {
    expect(getIntervalDays("default", "Primary")).toBe(7);
    expect(getIntervalDays("default", "Secondary")).toBe(14);
    expect(getIntervalDays("default", "Watch")).toBe(30);
  });

  it("returns Infinity for 'never' frequency", () => {
    expect(getIntervalDays("never", "Primary")).toBe(Infinity);
  });

  it("maps explicit frequencies to days", () => {
    expect(getIntervalDays("daily", "Primary")).toBe(1);
    expect(getIntervalDays("weekly", "Watch")).toBe(7);
    expect(getIntervalDays("biweekly", "Watch")).toBe(14);
    expect(getIntervalDays("monthly", "Primary")).toBe(30);
  });

  it("falls back to 30 for unknown priority with default", () => {
    expect(getIntervalDays("default", "Unknown")).toBe(30);
  });
});

describe("isDue", () => {
  const now = new Date("2026-03-15T07:00:00Z");

  it("returns true when never run", () => {
    expect(isDue(null, 7, now)).toBe(true);
  });

  it("returns false for never frequency (Infinity interval)", () => {
    expect(isDue(null, Infinity, now)).toBe(false);
  });

  it("returns true when interval has elapsed", () => {
    // Last run 8 days ago, interval is 7 days
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    expect(isDue(eightDaysAgo.toISOString(), 7, now)).toBe(true);
  });

  it("returns false when interval has not elapsed", () => {
    // Last run 3 days ago, interval is 7 days
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(isDue(threeDaysAgo.toISOString(), 7, now)).toBe(false);
  });

  it("returns true when exactly at interval boundary", () => {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(isDue(sevenDaysAgo.toISOString(), 7, now)).toBe(true);
  });
});

describe("GET /api/cron/run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No CRON_SECRET set by default
    delete process.env.CRON_SECRET;
  });

  it("returns 401 when CRON_SECRET is set and auth header is wrong", async () => {
    process.env.CRON_SECRET = "my-secret";
    setupMocks({ settings: null });

    const req = makeRequest({ authorization: "Bearer wrong" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("allows request when CRON_SECRET matches", async () => {
    process.env.CRON_SECRET = "my-secret";
    setupMocks({
      settings: {
        gemini_api_key: "key",
        schedule_enabled: true,
        enabled_sources: ["hackernews"],
        product_name: "Test",
        product_context: "Context",
      },
      competitors: [],
    });

    const req = makeRequest({ authorization: "Bearer my-secret" });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.skipped).toBe(true);
    expect(json.reason).toContain("No competitors");
  });

  it("skips when no API key is configured", async () => {
    setupMocks({ settings: { gemini_api_key: "", schedule_enabled: true } });

    const req = makeRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(json.skipped).toBe(true);
    expect(json.reason).toContain("No Gemini API key");
  });

  it("skips when schedule is disabled", async () => {
    setupMocks({
      settings: { gemini_api_key: "key", schedule_enabled: false },
    });

    const req = makeRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(json.skipped).toBe(true);
    expect(json.reason).toContain("disabled");
  });

  it("skips when no competitors are configured", async () => {
    setupMocks({
      settings: {
        gemini_api_key: "key",
        schedule_enabled: true,
        enabled_sources: ["hackernews"],
        product_name: "P",
        product_context: "C",
      },
      competitors: [],
    });

    const req = makeRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(json.skipped).toBe(true);
    expect(json.reason).toContain("No competitors");
  });

  it("reports no competitors due when all recently run", async () => {
    const recentRun = new Date().toISOString();
    setupMocks({
      settings: {
        gemini_api_key: "key",
        schedule_enabled: true,
        enabled_sources: ["hackernews"],
        product_name: "P",
        product_context: "C",
      },
      competitors: [
        { id: "c1", name: "Rival", priority: "Primary", schedule_frequency: "default" },
      ],
      latestRuns: [{ competitor_id: "c1", completed_at: recentRun }],
    });

    const req = makeRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(json.skipped).toBe(false);
    expect(json.reason).toContain("No competitors due");
    expect(json.checked).toBe(1);
  });

  it("runs analysis for due competitors", async () => {
    const oldRun = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    setupMocks({
      settings: {
        gemini_api_key: "key",
        schedule_enabled: true,
        enabled_sources: ["hackernews", "reddit"],
        product_name: "MyProduct",
        product_context: "Context here",
      },
      competitors: [
        { id: "c1", name: "Rival", priority: "Primary", schedule_frequency: "default" },
      ],
      latestRuns: [{ competitor_id: "c1", completed_at: oldRun }],
    });

    const req = makeRequest();
    const res = await GET(req);
    const json = await res.json();

    expect(json.ran).toBe(1);
    expect(json.results[0].competitor).toBe("Rival");
    expect(json.results[0].status).toBe("completed");
    expect(json.results[0].findings_count).toBe(1);
  });

  it("runs never-before-run competitors", async () => {
    setupMocks({
      settings: {
        gemini_api_key: "key",
        schedule_enabled: true,
        enabled_sources: ["hackernews"],
        product_name: "P",
        product_context: "C",
      },
      competitors: [
        { id: "c2", name: "NewRival", priority: "Watch", schedule_frequency: "default" },
      ],
      latestRuns: [],
    });

    const req = makeRequest();
    const res = await GET(req);
    const json = await res.json();

    expect(json.ran).toBe(1);
    expect(json.results[0].competitor).toBe("NewRival");
    expect(json.results[0].status).toBe("completed");
  });

  it("skips competitors with 'never' schedule", async () => {
    setupMocks({
      settings: {
        gemini_api_key: "key",
        schedule_enabled: true,
        enabled_sources: ["hackernews"],
        product_name: "P",
        product_context: "C",
      },
      competitors: [
        { id: "c3", name: "ManualOnly", priority: "Primary", schedule_frequency: "never" },
      ],
      latestRuns: [],
    });

    const req = makeRequest();
    const res = await GET(req);
    const json = await res.json();

    expect(json.skipped).toBe(false);
    expect(json.reason).toContain("No competitors due");
  });
});
