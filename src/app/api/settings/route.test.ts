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
    expect(json.settings.has_api_key).toBe(false);
    expect(json.settings.gemini_api_key).toBe("");
    expect(json.settings.enabled_sources).toEqual(["hackernews", "reddit", "youtube"]);
  });

  it("returns saved settings with masked API key", async () => {
    const savedSettings = {
      product_name: "MyProduct",
      product_context: "We build stuff",
      gemini_api_key: "AIza1234567890abcdef",
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
    // API key should be masked
    expect(json.settings.gemini_api_key).not.toBe("AIza1234567890abcdef");
    expect(json.settings.gemini_api_key).toContain("****");
    expect(json.settings.gemini_api_key).toMatch(/^AIza/);
    expect(json.settings.gemini_api_key).toMatch(/cdef$/);
    expect(json.settings.has_api_key).toBe(true);
  });

  it("returns has_api_key false when key is empty", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { gemini_api_key: "" },
            error: null,
          }),
        }),
      }),
    });

    const res = await GET();
    const json = await res.json();
    expect(json.settings.has_api_key).toBe(false);
  });

  it("returns 500 on unexpected database error without leaking details", async () => {
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
    const json = await res.json();
    expect(res.status).toBe(500);
    // Should not leak internal error message
    expect(json.error).toBe("Failed to load settings");
    expect(json.details).toBeUndefined();
  });
});

describe("PUT /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts settings and returns masked API key", async () => {
    const upsertedData = {
      user_id: "temp-local-user",
      product_name: "NewProduct",
      gemini_api_key: "AIzaNewKey12345678",
      schedule_enabled: true,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "settings") {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: upsertedData,
                error: null,
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const req = makePutRequest({
      product_name: "NewProduct",
      gemini_api_key: "AIzaNewKey12345678",
      schedule_enabled: true,
    });

    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.settings.product_name).toBe("NewProduct");
    // API key should be masked in response
    expect(json.settings.gemini_api_key).not.toBe("AIzaNewKey12345678");
    expect(json.settings.has_api_key).toBe(true);
  });

  it("returns 500 on upsert failure without leaking details", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "settings") {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Permission denied" },
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const req = makePutRequest({ product_name: "Test" });
    const res = await PUT(req);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to save settings");
    expect(json.details).toBeUndefined();
  });

  it("rejects invalid email format", async () => {
    const req = makePutRequest({ email: "not-an-email" });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("email");
  });

  it("rejects non-string product_name", async () => {
    const req = makePutRequest({ product_name: 123 });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("rejects non-boolean schedule_enabled", async () => {
    const req = makePutRequest({ schedule_enabled: "yes" });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("filters invalid sources from enabled_sources", async () => {
    const upsertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { user_id: "temp-local-user", gemini_api_key: "" },
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "settings") {
        return {
          upsert: upsertFn,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const req = makePutRequest({
      enabled_sources: ["hackernews", "twitter", "malicious_source"],
    });
    await PUT(req);

    const upsertCall = upsertFn.mock.calls[0][0];
    expect(upsertCall.enabled_sources).toEqual(["hackernews"]);
  });

  it("preserves existing API key when not sent in request", async () => {
    const upsertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { user_id: "temp-local-user", gemini_api_key: "AIzaExisting123456" },
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "settings") {
        return {
          upsert: upsertFn,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { gemini_api_key: "AIzaExisting123456" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    // Don't include gemini_api_key in body
    const req = makePutRequest({ product_name: "Test" });
    await PUT(req);

    const upsertCall = upsertFn.mock.calls[0][0];
    expect(upsertCall.gemini_api_key).toBe("AIzaExisting123456");
  });

  it("truncates overly long product_name", async () => {
    const upsertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { user_id: "temp-local-user", gemini_api_key: "" },
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "settings") {
        return {
          upsert: upsertFn,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const longName = "A".repeat(500);
    const req = makePutRequest({ product_name: longName });
    await PUT(req);

    const upsertCall = upsertFn.mock.calls[0][0];
    expect(upsertCall.product_name.length).toBe(200);
  });
});
