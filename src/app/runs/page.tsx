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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Play, Clock } from "lucide-react";

const demoRuns = [
  {
    id: "run-003",
    date: "2024-12-15",
    type: "Scheduled",
    status: "completed",
    findings: 3,
    sources: 5,
    duration: "2m 34s",
  },
  {
    id: "run-002",
    date: "2024-12-10",
    type: "Triggered",
    status: "completed",
    findings: 1,
    sources: 3,
    duration: "1m 12s",
  },
  {
    id: "run-001",
    date: "2024-12-08",
    type: "Manual",
    status: "completed",
    findings: 2,
    sources: 7,
    duration: "3m 05s",
  },
];

const statusVariant = {
  completed: "default",
  running: "outline",
  failed: "destructive",
} as const;

export default function RunsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Runs</h1>
          <p className="text-muted-foreground">
            Analysis run history and manual triggers
          </p>
        </div>
        <Button>
          <Play className="mr-2 h-4 w-4" />
          Run Now
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">Weekly — Mon 7am</p>
            <p className="text-xs text-muted-foreground">
              Next run in 6 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Changelog Trigger</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">Active</p>
            <p className="text-xs text-muted-foreground">
              Runs when changelog diff detected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Silence Alert</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">2+ weeks quiet</p>
            <p className="text-xs text-muted-foreground">
              Flags when competitor goes silent
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run History</CardTitle>
          <CardDescription>
            Demo data — will populate after first real run
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead>Sources</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demoRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-mono text-xs">
                    {run.id}
                  </TableCell>
                  <TableCell>{run.date}</TableCell>
                  <TableCell>{run.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statusVariant[
                          run.status as keyof typeof statusVariant
                        ]
                      }
                    >
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{run.findings}</TableCell>
                  <TableCell>{run.sources}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {run.duration}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
