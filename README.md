# Recon

Competitive intelligence that runs itself. Recon monitors your competitors across the web and tells you when their claims don't match reality — so you can stop doomscrolling and start making decisions.

## What it does

You tell Recon who to watch. It pulls from Hacker News, Reddit, G2, YouTube, Product Hunt, changelogs, and LinkedIn jobs — then cross-references everything to find the gap between what a competitor *says* and what users *actually experience*.

Every finding follows a structured format: **Claim → Reality → Threat Level → What to do about it.** Nothing surfaces unless it's backed by at least two independent sources.

## How it works

An AI agent (Gemini) does the analysis humans don't have time for:

1. **Fetch** — Pulls data from 7+ sources per competitor on a weekly schedule or when a changelog diff is detected
2. **Correlate** — Cross-references findings across sources. A Reddit complaint alone isn't signal. A Reddit complaint + a G2 review + a job posting telling the same story is.
3. **Analyze** — Evaluates each finding against your product context. Instead of generic summaries, you get specific implications: which of *your* users are at risk, what *your* product does better, and whether you need to act.
4. **Deliver** — Structured briefs via email or dashboard. If a finding warrants hands-on testing, the agent tells you exactly what to test and what to look for.

## Why it matters

Competitive intelligence today is either expensive (analyst teams) or shallow (Google Alerts). Recon sits in the middle — an always-on agent that reads the sources you'd read yourself, but catches what you'd miss by correlating across them. It turns a 2-hour weekly ritual into a 5-minute Monday morning read.

## Stack

Next.js · TypeScript · Tailwind · shadcn/ui · Gemini API · Supabase · Clerk

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
