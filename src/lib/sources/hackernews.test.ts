import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchHackerNews } from "./hackernews";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockHNResponse(stories: unknown[] = [], comments: unknown[] = []) {
  mockFetch.mockImplementation((url: string) => {
    const isComment = url.includes("tags=comment");
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          hits: isComment ? comments : stories,
        }),
    });
  });
}

describe("fetchHackerNews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct structure with empty results", async () => {
    mockHNResponse();
    const result = await fetchHackerNews("TestCompany");

    expect(result.source).toBe("hackernews");
    expect(result.queries).toContain("TestCompany");
    expect(result.stories).toEqual([]);
    expect(result.comments).toEqual([]);
    expect(result.fetchedAt).toBeDefined();
  });

  it("generates fuzzy search variants for camelCase names", async () => {
    mockHNResponse();
    const result = await fetchHackerNews("RunwayML");

    expect(result.queries).toContain("RunwayML");
    expect(result.queries).toContain("Runway ML");
    expect(result.queries).toContain("runwayml");
  });

  it("generates variants for multi-word names", async () => {
    mockHNResponse();
    const result = await fetchHackerNews("Pika Labs");

    expect(result.queries).toContain("Pika Labs");
    expect(result.queries).toContain("PikaLabs");
    expect(result.queries).toContain("Pika");
    expect(result.queries).toContain("pika labs");
  });

  it("does not extract first word if it is shorter than 4 chars", async () => {
    mockHNResponse();
    const result = await fetchHackerNews("AI Corp");

    // "AI" is only 2 chars, should not be extracted as a standalone variant
    expect(result.queries).not.toContain("AI");
  });

  it("deduplicates stories by objectID", async () => {
    const story = {
      objectID: "123",
      title: "Test Story",
      url: "https://example.com",
      author: "user1",
      points: 100,
      num_comments: 5,
      created_at: "2025-01-01T00:00:00Z",
    };
    // Same story returned for multiple query variants
    mockHNResponse([story, story]);

    const result = await fetchHackerNews("TestCompany");
    const ids = result.stories.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it("deduplicates comments by objectID", async () => {
    const comment = {
      objectID: "456",
      comment_text: "Great product",
      author: "user2",
      story_title: "Some Story",
      created_at: "2025-01-01T00:00:00Z",
    };
    mockHNResponse([], [comment, comment]);

    const result = await fetchHackerNews("TestCompany");
    const ids = result.comments.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("strips HTML from comment text", async () => {
    const comment = {
      objectID: "789",
      comment_text: "<p>This is <b>bold</b> &amp; &lt;cool&gt;</p>",
      author: "user3",
      story_title: "Test",
      created_at: "2025-01-01T00:00:00Z",
    };
    mockHNResponse([], [comment]);

    const result = await fetchHackerNews("TestCompany");
    expect(result.comments[0].text).toBe('This is bold & <cool>');
  });

  it("skips comments without text", async () => {
    const noText = {
      objectID: "111",
      comment_text: null,
      author: "user4",
      story_title: "Test",
      created_at: "2025-01-01T00:00:00Z",
    };
    const withText = {
      objectID: "222",
      comment_text: "Actual comment",
      author: "user5",
      story_title: "Test",
      created_at: "2025-01-01T00:00:00Z",
    };
    mockHNResponse([], [noText, withText]);

    const result = await fetchHackerNews("TestCompany");
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].id).toBe("222");
  });

  it("sorts stories by recency (newest first)", async () => {
    const older = {
      objectID: "1",
      title: "Old",
      url: null,
      author: "a",
      points: 10,
      num_comments: 1,
      created_at: "2025-01-01T00:00:00Z",
    };
    const newer = {
      objectID: "2",
      title: "New",
      url: null,
      author: "b",
      points: 5,
      num_comments: 0,
      created_at: "2025-06-01T00:00:00Z",
    };
    mockHNResponse([older, newer]);

    const result = await fetchHackerNews("TestCompany");
    expect(result.stories[0].id).toBe("2");
    expect(result.stories[1].id).toBe("1");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    await expect(fetchHackerNews("TestCompany")).rejects.toThrow("HN API error");
  });

  it("handles null points and num_comments gracefully", async () => {
    const story = {
      objectID: "999",
      title: "No stats",
      url: null,
      author: "anon",
      points: null,
      num_comments: null,
      created_at: "2025-03-01T00:00:00Z",
    };
    mockHNResponse([story]);

    const result = await fetchHackerNews("TestCompany");
    expect(result.stories[0].points).toBe(0);
    expect(result.stories[0].numComments).toBe(0);
  });
});
