"use client";

import { useState } from "react";
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

export default function SettingsPage() {
  const [productName, setProductName] = useState("Google Vids");
  const [productContext, setProductContext] = useState(
    "AI-powered video creation tool within Google Workspace. Core users: marketing teams, L&D, enterprise communications. Key advantages: Workspace integration, Drive, Docs/Slides handoff, enterprise security, Google Meet, existing seat count."
  );
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");

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
              Used in the &quot;IMPLICATION FOR [YOUR PRODUCT]&quot; section of
              every finding.
            </p>
          </div>
          <Button>Save Product Context</Button>
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
          <Button>Save Email</Button>
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
            <Label htmlFor="claude-key">Claude API Key</Label>
            <Input
              id="claude-key"
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used for the analysis engine. Get one at console.anthropic.com.
            </p>
          </div>
          <Button>Save API Key</Button>
        </CardContent>
      </Card>
    </div>
  );
}
