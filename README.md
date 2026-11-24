# Certification Exam Simulator

A local-first web app for practising certification exams. No login required, no cloud dependency — just clone, install, and start drilling. Currently ships with **CCAR-F (Claude Certified Architect – Foundations)** question sets and is designed to support additional certifications with no code changes.

---

## Features

### Exam Modes
- **Proctored** — timed exam (default 120 min), no feedback until submission, mirrors the real test experience
- **Practice** — instant per-question feedback, choice-level explanations visible after each answer, no timer pressure

### Exam Builder
- Launch a full set directly (one click per set)
- Build a custom exam: mix questions from multiple sets, pick a random question count, toggle question/option shuffle

### During the Exam
- One question at a time with a right-side navigator grid
- Status colours: unanswered / answered / flagged
- Flag questions for review
- Keyboard shortcuts — `A/B/C/D` select choices, `→` next, `←` prev, `F` flag
- Scratchpad drawer for working notes
- Countdown timer with amber warning at 10 min and red pulse at 2 min; auto-submits at 0:00
- Pre-submit review screen (Pearson VUE-style) before final submission

### Score Report
- Scaled score 100–1000 (passing ≥ 720), PASS/FAIL badge
- Score gauge with passing line marker
- Domain-by-domain performance breakdown
- Full answer review: every question with your answer, the correct answer, per-choice explanations, and key learning points
- Filter review by All / Incorrect / Flagged / Domain
- **Download as PDF** — one click, browser-native quality

### History & Analytics
- Past Attempts tab on the lobby — every submitted exam with score, mode, and date
- Analytics page — cumulative domain performance, pass rate, average score across all attempts
- History is stored in your browser (localStorage) — no shared state between users

### Multi-Certification Support
- Certifications are auto-detected from subdirectories under `data/sets/`
- Add a new cert by creating `data/sets/<cert-id>/` and dropping in HTML question files
- Lobby shows a certification selector when multiple certs are present

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18 or later
- npm (comes with Node.js)

### Run locally

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Share on a local network

Run the dev server on a machine that your colleagues can reach, then have them open:

```
http://<your-machine-ip>:3000
```

Each person's attempt history is stored only in their own browser — no cross-user visibility.

---

## Project Structure

```
data/
  sets/
    ccar-f/          ← question bank HTML files (one file per set)
  sessions/          ← persisted session snapshots (auto-created, gitignored)

src/
  app/               ← Next.js App Router pages and API routes
    api/
      certs/         ← GET available certifications
      certs/[certId]/
        sets/        ← GET sets for a certification
        questions/   ← GET questions for a set
      sessions/      ← create and manage exam sessions
      upload/        ← upload new HTML question files
    exam/            ← exam interface page
    results/         ← score report page
    analytics/       ← cumulative analytics page
  lib/
    parser.ts        ← cheerio-based HTML question parser
    store.ts         ← in-memory + disk session/question store
    scoring.ts       ← scaled score calculation
    useHistory.ts    ← localStorage history hook
  types/
    exam.ts          ← shared TypeScript types
```

---

## Adding a New Certification

1. Create a subfolder: `data/sets/<cert-id>/`
2. Add HTML question files (same format as the existing CCAR-F files)
3. Restart the dev server — the cert appears automatically in the lobby

No code changes needed.

---

## Verify the Question Bank

```bash
npx tsx scripts/verify-parse.ts
```

Parses all HTML files and reports per-set question counts, domain breakdowns, and any parse errors.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| HTML Parsing | cheerio (server-side) |
| State | React hooks + localStorage (client) |
| Persistence | JSON files on disk (sessions only) |
| Database | None |
| Auth | None |

---

## Current Certifications

| ID | Name | Sets | Questions |
|---|---|---|---|
| `ccar-f` | CCAR-F – Claude Certified Architect, Foundations | 13 | 815 |
