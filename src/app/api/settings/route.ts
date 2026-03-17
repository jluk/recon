import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TEMP_USER_ID = "temp-local-user";

const VALID_SOURCES = ["hackernews", "reddit", "youtube"];
const MAX_PRODUCT_NAME_LENGTH = 200;
const MAX_PRODUCT_CONTEXT_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;
const MAX_API_KEY_LENGTH = 256;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Mask an API key for safe display: show first 4 and last 4 chars */
function maskApiKey(key: string): string {
  if (!key || key.length < 10) return key ? "****" : "";
  return `${key.slice(0, 4)}${"*".repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
}

export async function GET() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", TEMP_USER_ID)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }

  // Never return the full API key to the client
  const settings = data
    ? {
        ...data,
        gemini_api_key: maskApiKey(data.gemini_api_key ?? ""),
        has_api_key: !!(data.gemini_api_key && data.gemini_api_key.length > 0),
      }
    : {
        product_name: "",
        product_context: "",
        gemini_api_key: "",
        has_api_key: false,
        email: "",
        enabled_sources: ["hackernews", "reddit", "youtube"],
        schedule_enabled: false,
      };

  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabase();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    product_name,
    product_context,
    gemini_api_key,
    email,
    enabled_sources,
    schedule_enabled,
  } = body;

  // Validate field types and lengths
  if (product_name !== undefined && typeof product_name !== "string") {
    return NextResponse.json({ error: "product_name must be a string" }, { status: 400 });
  }
  if (product_context !== undefined && typeof product_context !== "string") {
    return NextResponse.json({ error: "product_context must be a string" }, { status: 400 });
  }
  if (gemini_api_key !== undefined && typeof gemini_api_key !== "string") {
    return NextResponse.json({ error: "gemini_api_key must be a string" }, { status: 400 });
  }
  if (email !== undefined && typeof email !== "string") {
    return NextResponse.json({ error: "email must be a string" }, { status: 400 });
  }
  if (schedule_enabled !== undefined && typeof schedule_enabled !== "boolean") {
    return NextResponse.json({ error: "schedule_enabled must be a boolean" }, { status: 400 });
  }

  const prodName = typeof product_name === "string" ? product_name.slice(0, MAX_PRODUCT_NAME_LENGTH) : "";
  const prodContext = typeof product_context === "string" ? product_context.slice(0, MAX_PRODUCT_CONTEXT_LENGTH) : "";
  const emailVal = typeof email === "string" ? email.slice(0, MAX_EMAIL_LENGTH) : "";

  // Validate email format if provided
  if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Allowlist enabled_sources
  let validSources = VALID_SOURCES;
  if (Array.isArray(enabled_sources)) {
    validSources = enabled_sources.filter(
      (s): s is string => typeof s === "string" && VALID_SOURCES.includes(s)
    );
    if (validSources.length === 0) {
      validSources = VALID_SOURCES;
    }
  }

  // Resolve API key: if not provided or masked, preserve existing key
  let finalApiKey: string;
  const rawApiKey = typeof gemini_api_key === "string" ? gemini_api_key.slice(0, MAX_API_KEY_LENGTH) : "";
  if (!gemini_api_key || rawApiKey.includes("*")) {
    // Key not sent or is the masked version — keep the stored key
    const { data: existing } = await supabase
      .from("settings")
      .select("gemini_api_key")
      .eq("user_id", TEMP_USER_ID)
      .single();
    finalApiKey = existing?.gemini_api_key ?? "";
  } else {
    finalApiKey = rawApiKey;
  }

  const { data, error } = await supabase
    .from("settings")
    .upsert(
      {
        user_id: TEMP_USER_ID,
        product_name: prodName,
        product_context: prodContext,
        gemini_api_key: finalApiKey,
        email: emailVal,
        enabled_sources: validSources,
        schedule_enabled: schedule_enabled ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }

  // Return with masked key
  return NextResponse.json({
    settings: {
      ...data,
      gemini_api_key: maskApiKey(data.gemini_api_key ?? ""),
      has_api_key: !!(data.gemini_api_key && data.gemini_api_key.length > 0),
    },
  });
}
