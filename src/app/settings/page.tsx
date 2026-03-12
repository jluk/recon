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
import { Check } from "lucide-react";

export default function SettingsPage() {
  const [productName, setProductName] = useState("");
  const [productContext, setProductContext] = useState("");
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    setProductName(
      localStorage.getItem("recon_product_name") ?? "Google Vids"
    );
    setProductContext(
      localStorage.getItem("recon_product_context") ??
        "AI-powered video creation tool within Google Workspace. Core users: marketing teams, L&D, enterprise communications."
    );
    setEmail(localStorage.getItem("recon_email") ?? "");
    setApiKey(localStorage.getItem("recon_gemini_key") ?? "");
  }, []);

  function save(key: string, value: string, label: string) {
    localStorage.setItem(key, value);
    setSaved(label);
    setTimeout(() => setSaved(null), 2000);
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
            onClick={() => {
              save("recon_product_name", productName, "Product");
              save("recon_product_context", productContext, "Product");
            }}
          >
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
          <Button onClick={() => save("recon_email", email, "Email")}>
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
            onClick={() => save("recon_gemini_key", apiKey, "API Key")}
          >
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
    </div>
  );
}
