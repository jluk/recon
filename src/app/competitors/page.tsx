"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ExternalLink, MoreHorizontal } from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  website: string;
  description: string;
  priority: "Primary" | "Secondary" | "Watch";
  sourcesActive: number;
  lastChecked: string | null;
}

const initialCompetitors: Competitor[] = [
  {
    id: "runway",
    name: "RunwayML",
    website: "runway.com",
    description:
      "Most vocal, fastest shipping, highest claim/reality gap. Primary monitoring target.",
    priority: "Primary",
    sourcesActive: 7,
    lastChecked: null,
  },
];

const priorityVariant = {
  Primary: "destructive",
  Secondary: "outline",
  Watch: "secondary",
} as const;

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newDescription, setNewDescription] = useState("");

  function handleAdd() {
    if (!newName.trim()) return;
    setCompetitors([
      ...competitors,
      {
        id: newName.toLowerCase().replace(/\s+/g, "-"),
        name: newName,
        website: newWebsite,
        description: newDescription,
        priority: "Watch",
        sourcesActive: 0,
        lastChecked: null,
      },
    ]);
    setNewName("");
    setNewWebsite("");
    setNewDescription("");
    setOpen(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Competitors</h1>
          <p className="text-muted-foreground">
            Companies you&apos;re monitoring
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Competitor
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Competitor</DialogTitle>
              <DialogDescription>
                Set up monitoring for a new company.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Pika Labs"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="e.g. pika.art"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Notes</Label>
                <Textarea
                  id="description"
                  placeholder="Why are you tracking this competitor?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                Add Competitor
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {competitors.map((competitor) => (
          <Card key={competitor.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">
                    {competitor.name}
                  </CardTitle>
                  <Badge variant={priorityVariant[competitor.priority]}>
                    {competitor.priority}
                  </Badge>
                </div>
                <CardDescription>{competitor.description}</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <a
                  href={`https://${competitor.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  {competitor.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span>{competitor.sourcesActive} sources active</span>
                <span>
                  {competitor.lastChecked
                    ? `Last checked ${competitor.lastChecked}`
                    : "Never checked"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
