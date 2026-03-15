import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "./route";
import type { NextRequest } from "next/server";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

function makePutRequest(body: Record<string, unknown>) {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("GET /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default settings when none exist", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116", message: "No rows found" },
          }),
        }),
      }),
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.settings.product_name).toBe("");
    expect(json.settings.schedule_enabled).toBe(false);
    expect(json.settings.enabled_sources).toEqual(["hackernews", "reddit", "youtube"]);
  });

  it("returns saved settings when they exist", async () => {
    const savedSettings = {
      product_name: "MyProduct",
      product_context: "We build stuff",
      gemini_api_key: "AIza123",
      email: "me@co.com",
      enabled_sources: ["hackernews", "reddit"],
      schedule_enabled: true,
    };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: savedSettings,
            error: null,
          }),
        }),
      }),
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.settings.product_name).toBe("MyProduct");
    expect(json.settings.schedule_enabled).toBe(true);
  });

  it("returns 500 on unexpected database error", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "42P01", message: "relation does not exist" },
          }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("PUT /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts settings and returns saved data", async () => {
    const upsertedData = {
      user_id: "temp-local-user",
      product_name: "NewProduct",
      schedule_enabled: true,
    };

    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: upsertedData,
            error: null,
          }),
        }),
      }),
    });

    const req = makePutRequest({
      product_name: "NewProduct",
      schedule_enabled: true,
    });

    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.settings.product_name).toBe("NewProduct");
  });

  it("returns 500 on upsert failure", async () => {
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Permission denied" },
          }),
        }),
      }),
    });

    const req = makePutRequest({ product_name: "Test" });
    const res = await PUT(req);
    expect(res.status).toBe(500);
  });

  it("defaults missing fields to empty/false", async () => {
    const upsertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { user_id: "temp-local-user" },
          error: null,
        }),
      }),
    });

    mockFrom.mockReturnValue({ upsert: upsertFn });

    const req = makePutRequest({});
    await PUT(req);

    const upsertCall = upsertFn.mock.calls[0][0];
    expect(upsertCall.product_name).toBe("");
    expect(upsertCall.gemini_api_key).toBe("");
    expect(upsertCall.schedule_enabled).toBe(false);
    expect(upsertCall.enabled_sources).toEqual(["hackernews", "reddit", "youtube"]);
  });
});
