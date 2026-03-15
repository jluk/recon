import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchYouTube } from "./youtube";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeSearchResponse(videos: { id: string; title?: string; channel?: string }[] = []) {
  return {
    items: videos.map((v) => ({
      id: { videoId: v.id },
      snippet: {
        title: v.title ?? "Test Video",
        channelTitle: v.channel ?? "TestChannel",
        publishedAt: "2025-06-01T00:00:00Z",
      },
    })),
  };
}

function makeStatsResponse(stats: { id: string; views?: string; comments?: string }[] = []) {
  return {
    items: stats.map((s) => ({
      id: s.id,
      statistics: {
        viewCount: s.views ?? "1000",
        commentCount: s.comments ?? "10",
      },
    })),
  };
}

function makeCommentsResponse(comments: { id?: string; text?: string; author?: string }[] = []) {
  return {
    items: comments.map((c, i) => ({
      id: c.id ?? `comment_${i}`,
      snippet: {
        topLevelComment: {
          snippet: {
            textDisplay: c.text ?? "Test comment",
            authorDisplayName: c.author ?? "TestUser",
            likeCount: 5,
            publishedAt: "2025-06-01T00:00:00Z",
          },
        },
      },
    })),
  };
}

describe("fetchYouTube", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct structure with empty results", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    const result = await fetchYouTube("TestCompany", "fake-key");
    expect(result.source).toBe("youtube");
    expect(result.videos).toEqual([]);
    expect(result.comments).toEqual([]);
  });

  it("generates search variants for camelCase names", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    const result = await fetchYouTube("RunwayML", "fake-key");
    expect(result.queries).toContain("RunwayML");
    expect(result.queries).toContain("Runway ML");
  });

  it("fetches video stats after search", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeSearchResponse([{ id: "vid1" }])),
        });
      }
      if (url.includes("/videos")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(makeStatsResponse([{ id: "vid1", views: "50000", comments: "0" }])),
        });
      }
      // commentThreads - should not be called since commentCount is "0"
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });
    });

    const result = await fetchYouTube("TestCompany", "fake-key");
    expect(result.videos).toHaveLength(1);
    expect(result.videos[0].viewCount).toBe("50000");
  });

  it("deduplicates videos across query variants", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/search")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(makeSearchResponse([{ id: "dup_vid", title: "Same Video" }])),
        });
      }
      if (url.includes("/videos")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(makeStatsResponse([{ id: "dup_vid", comments: "0" }])),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });
    });

    const result = await fetchYouTube("RunwayML", "fake-key");
    const dupVids = result.videos.filter((v) => v.id === "dup_vid");
    expect(dupVids).toHaveLength(1);
  });

  it("only fetches comments for top 5 videos by view count", async () => {
    const videos = Array.from({ length: 8 }, (_, i) => ({
      id: `v${i}`,
      title: `Video ${i}`,
    }));
    const stats = Array.from({ length: 8 }, (_, i) => ({
      id: `v${i}`,
      views: String((8 - i) * 1000),
      comments: "5",
    }));

    const commentFetchedFor: string[] = [];

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeSearchResponse(videos)),
        });
      }
      if (url.includes("/videos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeStatsResponse(stats)),
        });
      }
      if (url.includes("/commentThreads")) {
        const videoIdMatch = url.match(/videoId=([^&]+)/);
        if (videoIdMatch) commentFetchedFor.push(videoIdMatch[1]);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeCommentsResponse([{ text: "Nice" }])),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
    });

    await fetchYouTube("TestCompany", "fake-key");
    expect(commentFetchedFor.length).toBeLessThanOrEqual(5);
  });

  it("skips comment fetching for videos with 0 comments", async () => {
    let commentsFetched = false;

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeSearchResponse([{ id: "nocomments" }])),
        });
      }
      if (url.includes("/videos")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(makeStatsResponse([{ id: "nocomments", comments: "0" }])),
        });
      }
      if (url.includes("/commentThreads")) {
        commentsFetched = true;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
    });

    await fetchYouTube("TestCompany", "fake-key");
    expect(commentsFetched).toBe(false);
  });

  it("handles search API failure gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    });

    const result = await fetchYouTube("TestCompany", "fake-key");
    expect(result.videos).toEqual([]);
    expect(result.comments).toEqual([]);
  });

  it("strips HTML from comment text", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeSearchResponse([{ id: "v1" }])),
        });
      }
      if (url.includes("/videos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeStatsResponse([{ id: "v1", comments: "1" }])),
        });
      }
      if (url.includes("/commentThreads")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              makeCommentsResponse([{ text: "<b>Bold</b> and <i>italic</i> text" }])
            ),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
    });

    const result = await fetchYouTube("TestCompany", "fake-key");
    expect(result.comments[0].text).toBe("Bold and italic text");
  });
});
