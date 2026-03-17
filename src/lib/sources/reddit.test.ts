import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchReddit } from "./reddit";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Speed up rate-limit delays in tests
vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: () => void) => {
  fn();
  return 0 as unknown as ReturnType<typeof setTimeout>;
});

const recentTimestamp = Math.floor(Date.now() / 1000) - 1000; // ~17 min ago

function makeRedditSearchResponse(posts: Record<string, unknown>[] = []) {
  return {
    data: {
      children: posts.map((p) => ({
        data: {
          id: p.id ?? "post1",
          title: p.title ?? "Test Post",
          selftext: p.selftext ?? "",
          author: p.author ?? "testuser",
          score: p.score ?? 10,
          num_comments: p.num_comments ?? 0,
          permalink: p.permalink ?? "/r/test/comments/abc/test_post",
          created_utc: p.created_utc ?? recentTimestamp,
        },
      })),
    },
  };
}

function makeRedditCommentsResponse(comments: Record<string, unknown>[] = []) {
  return [
    { data: { children: [] } }, // post data (ignored)
    {
      data: {
        children: comments.map((c) => ({
          data: {
            id: c.id ?? "comment1",
            body: c.body ?? "Test comment",
            author: c.author ?? "commenter",
            score: c.score ?? 5,
            created_utc: c.created_utc ?? recentTimestamp,
          },
        })),
      },
    },
  ];
}

describe("fetchReddit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct structure with empty results", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { children: [] } }),
    });

    const result = await fetchReddit("TestCompany");
    expect(result.source).toBe("reddit");
    expect(result.subreddits).toContain("artificial");
    expect(result.posts).toEqual([]);
    expect(result.comments).toEqual([]);
  });

  it("generates search variants", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { children: [] } }),
    });

    const result = await fetchReddit("RunwayML");
    expect(result.queries).toContain("RunwayML");
    expect(result.queries).toContain("Runway ML");
  });

  it("deduplicates posts across subreddits", async () => {
    const post = {
      id: "same_post",
      title: "Duplicate Post",
      num_comments: 0,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRedditSearchResponse([post])),
    });

    const result = await fetchReddit("TestCompany");
    const postIds = result.posts.filter((p) => p.id === "same_post");
    expect(postIds.length).toBe(1);
  });

  it("strips markdown from post selftext", async () => {
    const post = {
      id: "md1",
      selftext: "Check [this link](https://example.com) for **details**",
      num_comments: 0,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRedditSearchResponse([post])),
    });

    const result = await fetchReddit("TestCompany");
    const found = result.posts.find((p) => p.id === "md1");
    expect(found?.selftext).toBe("Check this link for details");
  });

  it("fetches comments only for high-engagement posts (>3 comments)", async () => {
    const lowEngagement = { id: "low", num_comments: 2 };
    const highEngagement = { id: "high", num_comments: 10, permalink: "/r/test/comments/high/post" };

    let callCount = 0;
    mockFetch.mockImplementation((url: string) => {
      callCount++;
      if (url.includes("/comments/high/")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              makeRedditCommentsResponse([{ id: "c1", body: "Great discussion" }])
            ),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(makeRedditSearchResponse([lowEngagement, highEngagement])),
      });
    });

    const result = await fetchReddit("TestCompany");
    // Should have comments from high-engagement post
    expect(result.comments.length).toBeGreaterThanOrEqual(1);
  });

  it("filters out AutoModerator comments", async () => {
    const post = { id: "p1", num_comments: 5, permalink: "/r/test/comments/p1/post" };

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/comments/")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              makeRedditCommentsResponse([
                { id: "auto", body: "Post removed", author: "AutoModerator" },
                { id: "real", body: "Real comment", author: "humanuser" },
              ])
            ),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(makeRedditSearchResponse([post])),
      });
    });

    const result = await fetchReddit("TestCompany");
    const autoComments = result.comments.filter((c) => c.author === "AutoModerator");
    expect(autoComments).toHaveLength(0);
  });

  it("sorts posts by score (highest first)", async () => {
    const posts = [
      { id: "low", score: 5, num_comments: 0 },
      { id: "high", score: 100, num_comments: 0 },
      { id: "mid", score: 50, num_comments: 0 },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRedditSearchResponse(posts)),
    });

    const result = await fetchReddit("TestCompany");
    // After dedup across subreddits, check ordering of unique posts
    const uniquePosts = result.posts.filter((p) =>
      ["low", "high", "mid"].includes(p.id)
    );
    if (uniquePosts.length >= 2) {
      for (let i = 1; i < uniquePosts.length; i++) {
        expect(uniquePosts[i - 1].score).toBeGreaterThanOrEqual(uniquePosts[i].score);
      }
    }
  });

  it("skips posts older than daysBack cutoff", async () => {
    const oldPost = {
      id: "old",
      created_utc: Math.floor(Date.now() / 1000) - 200 * 86400, // 200 days ago
      num_comments: 0,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRedditSearchResponse([oldPost])),
    });

    const result = await fetchReddit("TestCompany", 90);
    const found = result.posts.find((p) => p.id === "old");
    expect(found).toBeUndefined();
  });

  it("handles API failures gracefully", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });

    const result = await fetchReddit("TestCompany");
    expect(result.posts).toEqual([]);
    expect(result.comments).toEqual([]);
  });
});
