# Recon Roadmap

Organized by user problem, prioritized by impact. Each section maps to a GitHub issue.

---

## P0 — The product dies without these

### 1. Scheduled runs (automated monitoring)
**Problem**: Users must manually trigger every analysis. A competitive intelligence tool that requires you to remember to check it will be abandoned.

**What to build**:
- Vercel Cron job hitting `/api/run` on a schedule (default: Monday 7am)
- Per-competitor scheduling: Primary = weekly, Secondary = biweekly, Watch = monthly
- Settings page control for schedule frequency
- Run history shows "scheduled" vs "manual" run type (schema already supports this)

**Acceptance criteria**:
- Competitors are analyzed on their configured schedule without user intervention
- Runs page shows scheduled runs with correct type label

**Labels**: `priority: P0`, `area: backend`

---

### 2. Email digests and alerts
**Problem**: No one checks a dashboard daily. If a high-threat finding surfaces and sits unseen for a week, the tool failed. Email field exists in settings but is never used.

**What to build**:
- Weekly digest email: summary of new findings since last digest, grouped by threat level
- Triggered alert: immediate email when a High-threat finding is created
- Email provider: Resend (simple API, good DX)
- Unsubscribe / frequency control in Settings

**Acceptance criteria**:
- User receives weekly email with new findings summary
- High-threat findings trigger immediate email notification
- Settings page controls email frequency and opt-out

**Labels**: `priority: P0`, `area: backend`, `area: notifications`

---

### 3. Clerk authentication
**Problem**: Single hardcoded user. Can't deploy publicly, can't support teams, RLS policies are disabled. Blocks every multi-user feature.

**What to build**:
- Clerk integration with Next.js middleware
- Replace `TEMP_USER_ID` with Clerk JWT `sub` claim everywhere
- Enable RLS policies in Supabase (already written in schema.sql)
- Sign-in / sign-up pages

**Acceptance criteria**:
- Users can sign up, sign in, and only see their own data
- RLS policies active in production
- Existing temp-local-user data is migrated or reset

**Labels**: `priority: P0`, `area: auth`, `area: backend`

---

## P1 — Makes the product actually useful day-to-day

### 4. Clickable source links in findings
**Problem**: Findings show "HN comment by user1" or "Reddit r/artificial post" but there's no link. Users can't verify the evidence or share it. Undermines trust.

**What to build**:
- Store source URLs alongside source descriptions in finding data
- HN: link to `news.ycombinator.com/item?id=X`
- Reddit: link to `reddit.com/r/sub/comments/X`
- YouTube: link to `youtube.com/watch?v=X`
- Finding detail page renders sources as clickable links

**Acceptance criteria**:
- Each source in a finding links to the original content
- Existing findings without URLs gracefully fall back to text-only

**Labels**: `priority: P1`, `area: data-quality`, `area: frontend`

---

### 5. Finding status workflow (triage)
**Problem**: Findings pile up with no way to distinguish "already handled" from "needs attention." 50 findings and no triage = noise.

**What to build**:
- Finding status: `new` → `reviewed` → `acted_on` → `archived`
- Bulk status update from findings list
- Filter by status on findings page
- Dashboard shows "X findings need review" (only `new` status)

**Schema change**: Add `status` column to findings table (default: `new`)

**Acceptance criteria**:
- Users can triage findings through a status workflow
- Dashboard surfaces untriaged count
- Archived findings are hidden by default

**Labels**: `priority: P1`, `area: frontend`, `area: backend`

---

### 6. Run error transparency
**Problem**: When a source fails (rate limit, network error), the user sees "0 findings" and thinks the competitor has no signal. No way to tell "API failed" from "nothing found."

**What to build**:
- Return per-source status in API response: `{ source: "reddit", status: "error", error: "429 rate limited" }`
- Show source health badges on run detail (green/yellow/red per source)
- Surface "X sources failed" warning in run results
- Show "findings filtered by 2-source minimum: Y candidates dropped" count

**Acceptance criteria**:
- Users can see which sources succeeded/failed per run
- Partial failures don't silently produce misleading results

**Labels**: `priority: P1`, `area: backend`, `area: frontend`

---

### 7. Competitor dossier page
**Problem**: Findings are scattered in a flat list. No way to see "everything we know about Runway" in one view, or how their positioning has evolved.

**What to build**:
- `/competitors/[id]` page showing:
  - Competitor details (name, priority, website, notes)
  - Timeline of all findings, newest first
  - Threat level trend (are findings getting more or less threatening?)
  - Last run date and next scheduled run
  - "Silence detection": flag if no findings in 2+ weeks despite active runs

**Acceptance criteria**:
- Clicking a competitor card navigates to a dossier view
- Timeline shows positioning evolution over time
- Silence is explicitly flagged

**Labels**: `priority: P1`, `area: frontend`

---

### 8. Dashboard that drives action
**Problem**: Dashboard shows stats but doesn't tell you what to do. "5 findings" is informational; "3 high-threat findings need review for Runway" is actionable.

**What to build**:
- "Needs attention" section: high-threat findings with status `new`
- Per-competitor health: "Runway: 2 new findings, last run 3 days ago" vs "Pika: stale, last run 3 weeks ago"
- Quick action: "Run stale competitors" button
- "Last week" vs "last month" finding trend

**Acceptance criteria**:
- Dashboard surfaces actionable items, not just counts
- Stale competitors are highlighted
- One-click to run all stale competitors

**Labels**: `priority: P1`, `area: frontend`

---

## P2 — Multiplayer and sharing

### 9. Finding export (Slack, PDF, clipboard)
**Problem**: PM discovers a critical competitive insight. Can't share it in Slack, can't paste it into a doc, can't attach it to a roadmap item. The insight dies in the tool.

**What to build**:
- "Copy to clipboard" button on finding detail (formatted markdown)
- "Share to Slack" webhook integration (Settings page config)
- Export findings list as CSV
- Single finding export as formatted card (image or HTML)

**Acceptance criteria**:
- One-click copy produces a well-formatted summary
- CSV export works from findings list with current filters applied

**Labels**: `priority: P2`, `area: frontend`, `area: integrations`

---

### 10. Finding annotations and team notes
**Problem**: Finding says "Runway claims cinematic quality." PM knows context: "We tested this last month, it's real for 4-second clips but falls apart at 10s." No way to capture that.

**What to build**:
- Notes/comments section on finding detail page
- "We launched competing feature" annotation type
- Internal team context that enriches the finding

**Schema change**: New `finding_notes` table (finding_id, user_id, content, created_at)

**Acceptance criteria**:
- Users can add notes to findings
- Notes persist and are visible to all team members (after auth)

**Labels**: `priority: P2`, `area: frontend`, `area: backend`

---

## P3 — Scale and polish

### 11. Date range filter on findings
**Problem**: "Show me what happened in the last 2 weeks" is a natural query. Currently findings are sorted by date but can't be filtered by date range.

**What to build**:
- Date range picker in findings filter bar
- Presets: "Last 7 days", "Last 30 days", "Last 90 days", "All time"

**Labels**: `priority: P3`, `area: frontend`

---

### 12. Sort options for findings
**Problem**: Findings are always sorted by creation date. Sometimes you want to see highest-threat first, or group by competitor.

**What to build**:
- Sort dropdown: "Newest", "Threat level", "Confidence", "Competitor"
- Persist sort preference in localStorage

**Labels**: `priority: P3`, `area: frontend`

---

### 13. Competitor search and priority filter
**Problem**: With 20+ competitors, the competitors page becomes a long scroll. No way to filter by priority tier.

**What to build**:
- Search input on competitors page
- Priority filter tabs: "All", "Primary", "Secondary", "Watch"

**Labels**: `priority: P3`, `area: frontend`

---

### 14. Data freshness indicators per competitor
**Problem**: User ran Competitor A yesterday and Competitor B 6 weeks ago. Dashboard shows "last run: yesterday" which is misleading. No per-competitor freshness.

**What to build**:
- "Last analyzed" date on each competitor card
- Color coding: green (<7 days), yellow (7-21 days), red (>21 days)
- Dashboard widget: "X competitors are stale"

**Labels**: `priority: P3`, `area: frontend`

---

### 15. Twitter/X integration
**Problem**: Highest volume competitive signal source, currently missing. Deferred due to $100/mo API cost.

**What to build**:
- Twitter API v2 integration (search recent tweets, user timelines)
- Competitor Twitter handle config
- Sentiment and engagement analysis

**Blocker**: API cost — evaluate if the signal justifies $100/mo

**Labels**: `priority: P3`, `area: sources`, `area: backend`

---

### 16. Finding quality feedback loop
**Problem**: Some findings are spot-on, others miss the mark. No way to tell the system "this was useful" or "this was noise." Analysis quality stays static.

**What to build**:
- Thumbs up/down on findings
- Track accuracy rate per competitor, per source
- Feed quality signals back into analysis prompt (e.g., "users found Reddit-only findings less useful")

**Labels**: `priority: P3`, `area: ml`, `area: frontend`

---

## Issue creation template

For each item above, create a GitHub issue with:

```
Title: [P#] <title>
Labels: <labels from above>
Body:
## Problem
<problem description>

## What to build
<bullet list>

## Acceptance criteria
<bullet list>
```
