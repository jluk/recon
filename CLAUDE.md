# Recon

Competitive intelligence agent that monitors competitors and surfaces claim vs. reality gaps. Configurable for any product — set your product name, context, and competitors in the UI.

The core insight: **claims and reality always diverge. The gap between what a competitor says and what users actually experience is where real competitive intelligence lives.**

---

## What this does

1. Tracks competitors you define (with priority levels: Primary, Secondary, Watch)
2. Pulls from multiple independent sources: Hacker News, Reddit, YouTube
3. Analyzes findings with Gemini 2.5 Flash — structured claim vs. reality output
4. Surfaces threat level, why it matters, user segment overlap, and recommended action
5. Flags when a finding warrants manual product testing by a human

---

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui v4 (built on @base-ui/react)
- **Database**: Supabase (Postgres with RLS policies, currently disabled for dev)
- **LLM**: Google Gemini 2.5 Flash via `@google/genai` SDK
- **Auth**: None yet (Clerk planned — needed before public launch)
- **Deployment**: Not yet deployed (Vercel planned)

---

## Repo structure

```
recon/
├── files/
│   ├── CLAUDE.md        # This file — project context
│   └── SPEC.md          # Original agent job spec and eval criteria
└── app/                 # Next.js application
    ├── supabase/
    │   └── schema.sql   # Postgres schema (competitors, sources, runs, findings)
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx             # Dashboard — live stats from Supabase
    │   │   ├── competitors/page.tsx # CRUD for competitors
    │   │   ├── findings/page.tsx    # Filterable findings list
    │   │   ├── findings/[id]/page.tsx # Finding detail (claim vs reality)
    │   │   ├── runs/page.tsx        # Run history + multi-competitor trigger
    │   │   ├── settings/page.tsx    # Product context, email, API key
    │   │   ├── sources/page.tsx     # Source list (static, not yet wired)
    │   │   └── api/run/route.ts     # POST endpoint — fetch sources + analyze
    │   ├── components/
    │   │   ├── sidebar.tsx          # Nav sidebar
    │   │   └── ui/                  # shadcn components
    │   └── lib/
    │       ├── supabase.ts          # Browser client factory
    │       ├── database.types.ts    # Supabase-generated types
    │       ├── analyze.ts           # Gemini analysis pipeline
    │       └── sources/
    │           ├── hackernews.ts    # HN Algolia API (fuzzy search)
    │           ├── reddit.ts        # Reddit public JSON endpoints
    │           └── youtube.ts       # YouTube Data API
    └── .env.local                   # Supabase URL + anon key (gitignored)
```

---

## Data sources

| Source | Method | Auth |
|--------|--------|------|
| Hacker News | Algolia API — stories + comments, fuzzy name variants, 90-day window | None |
| Reddit | Public JSON endpoints — 6 subreddits, rate-limited | None |
| YouTube | Data API — search, stats, comments from top 5 videos | Google API key (same as Gemini) |

---

## Key patterns

- **Fuzzy competitor search**: e.g. "RunwayML" generates ["RunwayML", "Runway ML", "Runway", "runwayml"] for broader coverage
- **Multi-competitor runs**: Users select multiple competitors, they run sequentially with live progress
- **localStorage persistence**: API key, product name, product context shared between Settings and Runs pages
- **Temp user ID**: `TEMP_USER_ID = "temp-local-user"` used everywhere until Clerk is added
- **shadcn v4 patterns**: Uses `render` prop (not `asChild`) for DialogTrigger/DropdownMenuTrigger

---

## Core rules — never violate these

- **2-source minimum**: Never surface a finding backed by only one source
- **No press release summaries**: If the output could have been written by a competitor's own marketing team, it's bad output
- **Be specific**: "This affects your template workflow for marketing teams" not "this could impact your position"
- **Silence is signal**: Flag if competitor changelog and job postings go quiet for 2+ weeks
- **Weight HN highly**: HN comments are technically sophisticated, zero sponsored content, punish hype — treat as highest-quality community signal

---

## Manual test escalation criteria

Recommend a human manually tests the product only when ALL three are true:
1. Confidence is Medium or High
2. Threat level is High or Medium
3. Feature is testable in under 30 minutes on a free or standard tier

When recommending a test, specify exactly what to do and what a meaningful result looks like.

---

## What good output looks like

> "Runway announced Gen-3 Alpha with 'cinematic quality' positioning. GTM copy emphasizes film industry use cases. However, 70% of Reddit reactions mention 4-second clip limit as a dealbreaker for professional workflows. Three G2 reviews this month specifically cite this as reason for churn. Runway's latest job postings show 2 new roles for 'long-form video research.' Signal: the cinematic claim is aspirational, not current. They know it."

Specific. Sourced. Tells me something I wouldn't have noticed. Has a clear so-what.

## What bad output looks like

- "Runway is positioning itself as a leader in AI video generation"
- Restating their announcement without corroboration
- Flagging a pricing page reword when nothing substantively changed
- Two sources that are actually the same source (a tweet + a blog post citing that tweet)

---

## Testing

- **Framework**: Vitest with mocked `fetch` and external SDKs
- **Run**: `npm test` (single run) or `npm run test:watch` (watch mode)
- **Test location**: Co-located with source files (e.g. `analyze.ts` → `analyze.test.ts`)

### Rules — always follow these

- **Every new feature or bug fix must include tests.** If you add or modify logic in `src/lib/` or `src/app/api/`, add or update the corresponding `.test.ts` file in the same directory.
- **Run `npm test` before committing.** All tests must pass. Do not commit with failing tests.
- **Mock external dependencies, never call real APIs in tests.** Mock `fetch` for source modules (HN, Reddit, YouTube). Mock `@google/genai` for the analysis pipeline. Mock `@supabase/supabase-js` for the API route.
- **Test the important behavior, not implementation details.** Focus on: input/output contracts, edge cases (null, empty, malformed data), deduplication logic, error handling paths, and data transformation (HTML stripping, markdown stripping, JSON parsing).
- **Keep tests fast.** Mock rate-limit delays (`setTimeout`) in tests so the suite runs in under 2 seconds. No network calls, no database calls.

### Current test coverage

| File | Tests | What's covered |
|------|-------|----------------|
| `src/lib/sources/hackernews.test.ts` | 10 | Fuzzy variants, dedup, HTML stripping, sorting, null handling, API errors |
| `src/lib/sources/reddit.test.ts` | 8 | Dedup, markdown stripping, AutoModerator filtering, engagement gating, cutoff, API errors |
| `src/lib/sources/youtube.test.ts` | 7 | Stats fetch, comment limits, dedup, HTML stripping, zero-comment skip, API errors |
| `src/lib/analyze.test.ts` | 9 | JSON parsing, markdown-wrapped responses, empty/null/non-array responses, existing findings dedup, source formatting |
| `src/app/api/run/route.test.ts` | 11 | Field validation, run creation, source filtering, default values, debug output |

---

## Roadmap

- [ ] **Clerk authentication** — needed before public launch. RLS policies already written for JWT claims.
- [ ] **Email summaries** — weekly digest + triggered alerts via Resend or SendGrid
- [ ] **Deploy to Vercel** — get a live URL
- [ ] **Twitter/X integration** — highest volume signal, deferred due to $100/mo API cost
- [ ] **G2 integration** — needs scraping feasibility research
- [ ] **Scheduled runs** — weekly cron (Monday 7am) via Vercel Cron or similar
