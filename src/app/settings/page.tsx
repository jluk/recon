"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, CalendarClock } from "lucide-react";

export default function SettingsPage() {
  const [productName, setProductName] = useState("");
  const [productContext, setProductContext] = useState("");
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingAll, setSavingAll] = useState(false);

  // Load settings from server on mount, fall back to localStorage
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const { settings } = await res.json();
          if (settings) {
            setProductName(settings.product_name || localStorage.getItem("recon_product_name") || "Google Vids");
            setProductContext(settings.product_context || localStorage.getItem("recon_product_context") || "AI-powered video creation tool within Google Workspace. Core users: marketing teams, L&D, enterprise communications.");
            setEmail(settings.email || localStorage.getItem("recon_email") || "");
            setApiKey(settings.gemini_api_key || localStorage.getItem("recon_gemini_key") || "");
            setScheduleEnabled(settings.schedule_enabled ?? false);
            setLoadingSettings(false);
            return;
          }
        }
      } catch {
        // Fall back to localStorage
      }
      setProductName(localStorage.getItem("recon_product_name") ?? "Google Vids");
      setProductContext(
        localStorage.getItem("recon_product_context") ??
          "AI-powered video creation tool within Google Workspace. Core users: marketing teams, L&D, enterprise communications."
      );
      setEmail(localStorage.getItem("recon_email") ?? "");
      setApiKey(localStorage.getItem("recon_gemini_key") ?? "");
      setLoadingSettings(false);
    }
    load();
  }, []);

  async function saveToServer(label: string) {
    // Always keep localStorage in sync for the Runs page
    localStorage.setItem("recon_product_name", productName);
    localStorage.setItem("recon_product_context", productContext);
    localStorage.setItem("recon_email", email);
    localStorage.setItem("recon_gemini_key", apiKey);

    setSavingAll(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productName,
          product_context: productContext,
          gemini_api_key: apiKey,
          email,
          schedule_enabled: scheduleEnabled,
        }),
      });
      if (res.ok) {
        setSaved(label);
        setTimeout(() => setSaved(null), 2000);
      }
    } catch {
      // Still saved to localStorage
      setSaved(label);
      setTimeout(() => setSaved(null), 2000);
    }
    setSavingAll(false);
  }

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your product context and integrations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Product</CardTitle>
          <CardDescription>
            This context is injected into every analysis to make findings
            actionable for your specific product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Google Vids"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-context">Product Context</Label>
            <Textarea
              id="product-context"
              rows={4}
              value={productContext}
              onChange={(e) => setProductContext(e.target.value)}
              placeholder="Describe your product, target users, and key advantages..."
            />
            <p className="text-xs text-muted-foreground">
              This is what the AI uses to assess competitive implications. Be
              specific about your users, features, and advantages.
            </p>
          </div>
          <Button
            onClick={() => saveToServer("Product")}
            disabled={savingAll}
          >
            {savingAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {saved === "Product" ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Saved
              </span>
            ) : (
              "Save Product Context"
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery</CardTitle>
          <CardDescription>
            Where should reports be sent?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Weekly digest and triggered alerts will be sent here.
            </p>
          </div>
          <Button
            onClick={() => saveToServer("Email")}
            disabled={savingAll}
          >
            {savingAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {saved === "Email" ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Saved
              </span>
            ) : (
              "Save Email"
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Keys</CardTitle>
          <CardDescription>
            Keys for data sources and the analysis engine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gemini-key">Gemini API Key</Label>
            <Input
              id="gemini-key"
              type="password"
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used for the analysis engine. Get one at aistudio.google.com.
            </p>
          </div>
          <Button
            onClick={() => saveToServer("API Key")}
            disabled={savingAll}
          >
            {savingAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {saved === "API Key" ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Saved
              </span>
            ) : (
              "Save API Key"
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Scheduled Runs</CardTitle>
            <Badge variant={scheduleEnabled ? "default" : "secondary"}>
              {scheduleEnabled ? "Active" : "Off"}
            </Badge>
          </div>
          <CardDescription>
            Automatically analyze competitors on a recurring schedule. Each
            competitor runs based on its priority: Primary (weekly), Secondary
            (biweekly), Watch (monthly) — or set a custom frequency per
            competitor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 rounded-lg border border-border p-4">
            <CalendarClock className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                {scheduleEnabled
                  ? "Scheduled runs are enabled"
                  : "Enable scheduled runs"}
              </p>
              <p className="text-xs text-muted-foreground">
                {scheduleEnabled
                  ? "Competitors will be analyzed automatically based on their schedule frequency. Requires a Gemini API key to be saved above."
                  : "When enabled, a background job will check daily which competitors are due for analysis and run them automatically."}
              </p>
            </div>
            <Button
              variant={scheduleEnabled ? "outline" : "default"}
              size="sm"
              onClick={() => {
                const next = !scheduleEnabled;
                setScheduleEnabled(next);
                // Save immediately when toggling
                fetch("/api/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    product_name: productName,
                    product_context: productContext,
                    gemini_api_key: apiKey,
                    email,
                    schedule_enabled: next,
                  }),
                }).catch(() => {});
              }}
            >
              {scheduleEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
          {scheduleEnabled && !apiKey && (
            <p className="text-xs text-destructive">
              Save a Gemini API key above for scheduled runs to work.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
