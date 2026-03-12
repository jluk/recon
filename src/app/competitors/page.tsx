"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ExternalLink, MoreHorizontal, Loader2, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Competitor = Database["public"]["Tables"]["competitors"]["Row"];
type CompetitorPriority = "Primary" | "Secondary" | "Watch";

const priorityVariant = {
  Primary: "destructive",
  Secondary: "outline",
  Watch: "secondary",
} as const;

// Temporary user ID until Clerk is integrated
const TEMP_USER_ID = "temp-local-user";

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<CompetitorPriority>("Watch");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const supabase = createClient();

  async function loadCompetitors() {
    const { data, error } = await supabase
      .from("competitors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load competitors:", error);
    } else {
      setCompetitors((data as Competitor[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCompetitors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("competitors").insert({
      name: newName,
      website: newWebsite,
      description: newDescription,
      priority: newPriority,
      user_id: TEMP_USER_ID,
    });

    if (error) {
      console.error("Failed to add competitor:", error);
    } else {
      await loadCompetitors();
      setNewName("");
      setNewWebsite("");
      setNewDescription("");
      setNewPriority("Watch");
      setOpen(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from("competitors")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete competitor:", error);
    } else {
      setCompetitors(competitors.filter((c) => c.id !== id));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
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
                <Label htmlFor="priority">Priority</Label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority((v ?? "Watch") as CompetitorPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                    <SelectItem value="Watch">Watch</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {newPriority === "Primary" && "Your top competitive threat. Gets the most source coverage and monitoring frequency."}
                  {newPriority === "Secondary" && "Worth tracking regularly, but not your most urgent threat."}
                  {newPriority === "Watch" && "On your radar. You'll be alerted if they make a significant move."}
                </p>
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
              <Button onClick={handleAdd} className="w-full" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Add Competitor
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {competitors.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No competitors yet.</p>
          <p className="text-sm text-muted-foreground">
            Add one to start monitoring.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {competitors.map((competitor) => (
            <Card key={competitor.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">
                      {competitor.name}
                    </CardTitle>
                    <Badge variant={priorityVariant[competitor.priority as CompetitorPriority]}>
                      {competitor.priority}
                    </Badge>
                  </div>
                  {competitor.description && (
                    <CardDescription>{competitor.description}</CardDescription>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    {deleteConfirm === competitor.id ? (
                      <DropdownMenuItem
                        onClick={() => {
                          handleDelete(competitor.id);
                          setDeleteConfirm(null);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Confirm delete?
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteConfirm(competitor.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  {competitor.website && (
                    <a
                      href={`https://${competitor.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {competitor.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <span>
                    Added{" "}
                    {new Date(competitor.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
