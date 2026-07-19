# Fairway · Golf Dashboard v3

A polished golf performance app with dashboard insights, performance trends, course statistics, and CSV import/export.

## Features

### Dashboard
- Current handicap, average score, recent round, monthly stats
- Goal progress bars
- Quick actions
- **Today’s Insight** — data-driven featured card generated after rounds

### Performance Trends
- Handicap (to-par) trend, score trend, best-score progression, rolling average
- Personal best markers
- Range: Last 5 / 10 / 20 rounds, This year, All time

### Course Statistics
- Per-course: rounds, best/avg score, low F9/B9, best putts, GIR, fairway %, last played
- Rankings: most played, lowest average, most improved, favorite
- Search, sort, and filter

### Import / Export
- CSV import with validation, duplicate detection, preview, and summary
- Export round history or course statistics with date / course / season filters
- Success and error toast notifications

## Stack

- React 19 + TypeScript + Vite
- React Router
- Recharts
- date-fns, Papa Parse
- LocalStorage persistence (starts empty; player: Junho Lee)

## Quick start

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## CSV format

| Column | Required | Notes |
|--------|----------|--------|
| date | yes | `YYYY-MM-DD` |
| courseName | yes | |
| score | yes | Must equal front9 + back9 |
| par | no | default 72 |
| front9 / back9 | yes | |
| putts | yes | |
| gir | yes | **Percentage** 0–100 (`45` or `45%`) |
| fir | yes | **Percentage** 0–100 (`57` or `57%`). Legacy `fairwaysHit`/`fairwaysTotal` still accepted |
| yardage | no | default 6500 |
| notes | no | |

Use **Import / Export → Download template** for a ready-made sample file.
