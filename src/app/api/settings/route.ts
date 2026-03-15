import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TEMP_USER_ID = "temp-local-user";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
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
      { error: "Failed to load settings", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    settings: data ?? {
      product_name: "",
      product_context: "",
      gemini_api_key: "",
      email: "",
      enabled_sources: ["hackernews", "reddit", "youtube"],
      schedule_enabled: false,
    },
  });
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();

  const {
    product_name,
    product_context,
    gemini_api_key,
    email,
    enabled_sources,
    schedule_enabled,
  } = body;

  // Upsert: insert if not exists, update if exists
  const { data, error } = await supabase
    .from("settings")
    .upsert(
      {
        user_id: TEMP_USER_ID,
        product_name: product_name ?? "",
        product_context: product_context ?? "",
        gemini_api_key: gemini_api_key ?? "",
        email: email ?? "",
        enabled_sources: enabled_sources ?? ["hackernews", "reddit", "youtube"],
        schedule_enabled: schedule_enabled ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to save settings", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ settings: data });
}
