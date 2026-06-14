import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';
import {
  reviewHistory,
  onTimeInWindow,
  dueReviews,
  weekNumber,
  currentPhase,
  parseWeekRange,
  isItemDone,
  indexPracticedFiles,
  type Curriculum,
  type CurriculumPhase,
} from './today';
import { resolveCanonical, type ScheduleState } from './schedule';

const ROOT = process.cwd();
const PORTALS = ['leetcode', 'geeksforgeeks', 'hackerrank', 'interviewbit'] as const;
type Portal = (typeof PORTALS)[number];
type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Unknown';

// Targets for the readiness axes. Designs target doubles as the TRACKS denominator.
const DESIGN_TARGET = 18;
const MOCK_TARGET = 4;
const RETENTION_MIN_SAMPLE = 5; // below this many 30d reviews, retention reads n/a
const MOCK_MODES = ['mock-oa', 'mock-staged', 'mock-ai'] as const;
type MockMode = (typeof MOCK_MODES)[number];

interface ProblemMeta {
  title: string;
  difficulty: Difficulty;
  category: string;
  patterns: string[];
  companies: string[];
}

interface PracticeEntry {
  file: string;
  date: string;
  notes?: string;
  // Spaced-rep rating and mock tagging — present on newer entries only.
  rating?: 'fail' | 'hard' | 'good' | 'easy';
  mode?: string;
  slug?: string;
  url?: string;
}

interface MetaFile {
  problems: Record<string, ProblemMeta>;
  corePatterns: string[];
}

interface ProblemRecord extends ProblemMeta {
  file: string;
  portal: Portal;
  practiceCount: number;
  practiceLast30Days: number;
}

const COLORS = {
  bg: '#0d1117',
  panel: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  textMuted: '#8b949e',
  accent: '#58a6ff',
  easy: '#3fb950',
  medium: '#d29922',
  hard: '#f85149',
  unknown: '#6e7681',
  meter: '#a371f7',
  good: '#3fb950',
};

// Distinct colours for the six roadmap phases, reusing the existing palette.
const PHASE_COLORS = [COLORS.easy, COLORS.accent, COLORS.medium, COLORS.meter, COLORS.hard, COLORS.good];

/** Recursively list files under `dir` ending in `ext`. Defaults to `.ts` so the problem walk is unchanged. */
function walkDir(dir: string, ext = '.ts'): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkDir(full, ext));
    else if (entry.endsWith(ext)) out.push(full);
  }
  return out;
}

function loadMeta(): MetaFile {
  const path = join(ROOT, 'data', 'problems-meta.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadPractice(): PracticeEntry[] {
  const path = join(ROOT, 'data', 'practice.json');
  if (!existsSync(path)) return [];
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  return parsed.entries ?? [];
}

/** Spaced-rep state per file. Empty object when schedule.json is absent. */
function loadSchedule(): Record<string, ScheduleState> {
  const path = join(ROOT, 'data', 'schedule.json');
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8')).schedule ?? {};
}

/** 26-week roadmap. null when curriculum.json is absent — callers degrade gracefully. */
function loadCurriculum(): Curriculum | null {
  const path = join(ROOT, 'data', 'curriculum.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as Curriculum;
}

function toPosixPath(p: string): string {
  return p.split(sep).join(posix.sep);
}

function daysAgo(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / (24 * 3600 * 1000);
}

function gatherProblems(meta: MetaFile, practice: PracticeEntry[]): ProblemRecord[] {
  const records: ProblemRecord[] = [];
  const practiceByFile = new Map<string, PracticeEntry[]>();
  for (const e of practice) {
    if (!practiceByFile.has(e.file)) practiceByFile.set(e.file, []);
    practiceByFile.get(e.file)!.push(e);
  }

  for (const portal of PORTALS) {
    const dir = join(ROOT, portal);
    const files = walkDir(dir);
    for (const full of files) {
      const rel = toPosixPath(relative(ROOT, full));
      const m = meta.problems[rel];
      const fallback: ProblemMeta = {
        title: rel.split('/').pop()!.replace(/\.ts$/, ''),
        difficulty: 'Unknown',
        category: rel.split('/').slice(1, -1).join('/') || 'Uncategorized',
        patterns: [],
        companies: [],
      };
      const data = m ?? fallback;
      const entries = practiceByFile.get(rel) ?? [];
      records.push({
        ...data,
        file: rel,
        portal,
        practiceCount: entries.length,
        practiceLast30Days: entries.filter((e) => daysAgo(e.date) <= 30).length,
      });
    }
  }
  return records;
}

interface Stats {
  total: number;
  byPortal: Record<Portal, number>;
  byDifficulty: Record<Difficulty, number>;
  byCategory: Record<string, number>;
  byPattern: Record<string, number>;
  totalPractices: number;
  problemsPracticedLast30Days: number;
  unknownMetadata: number;
}

function computeStats(records: ProblemRecord[]): Stats {
  const byPortal = Object.fromEntries(PORTALS.map((p) => [p, 0])) as Record<Portal, number>;
  const byDifficulty: Record<Difficulty, number> = { Easy: 0, Medium: 0, Hard: 0, Unknown: 0 };
  const byCategory: Record<string, number> = {};
  const byPattern: Record<string, number> = {};
  let totalPractices = 0;
  let practicedLast30 = 0;
  let unknown = 0;

  for (const r of records) {
    byPortal[r.portal]++;
    byDifficulty[r.difficulty]++;
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    for (const pat of r.patterns) byPattern[pat] = (byPattern[pat] ?? 0) + 1;
    totalPractices += r.practiceCount;
    if (r.practiceLast30Days > 0) practicedLast30++;
    if (r.difficulty === 'Unknown') unknown++;
  }

  return {
    total: records.length,
    byPortal,
    byDifficulty,
    byCategory,
    byPattern,
    totalPractices,
    problemsPracticedLast30Days: practicedLast30,
    unknownMetadata: unknown,
  };
}

/** Count mock sessions per mode, optionally restricted to the last `withinDays` days. */
function countMocks(practice: PracticeEntry[], withinDays?: number): Record<MockMode, number> {
  const out: Record<MockMode, number> = { 'mock-oa': 0, 'mock-staged': 0, 'mock-ai': 0 };
  for (const e of practice) {
    if (!e.mode) continue;
    if (withinDays !== undefined && daysAgo(e.date) > withinDays) continue;
    if ((MOCK_MODES as readonly string[]).includes(e.mode)) out[e.mode as MockMode]++;
  }
  return out;
}

/** Files under `dir` (relative to ROOT) ending in `.md`, excluding templates/readmes. */
function countTrackFiles(dir: string, exclude: string[]): number {
  return walkDir(join(ROOT, dir), '.md').filter((f) => {
    const base = f.split(sep).pop()!;
    return !exclude.includes(base);
  }).length;
}

// Everything the new dashboard rows need, computed once in main.
interface Extras {
  reviewsDueToday: number;
  onTime: { onTime: number; total: number };
  onTimeRate: number | null; // null = too few samples to report
  curriculum: Curriculum | null;
  week: number;
  phase: CurriculumPhase | undefined;
  curriculumDone: number;
  curriculumTotal: number;
  curriculumBySource: Record<string, { done: number; total: number }>;
  designsDone: number;
  storiesDrilled: number;
  mockTotals: Record<MockMode, number>;
  mockLast30: number;
}

interface MaangMeter {
  score: number;
  coverage: number;
  volume: number;
  retention: number | null; // null = n/a (excluded + rescaled)
  hardRatio: number;
  mockReadiness: number;
  designReadiness: number;
  patternsHit: number;
  patternsTotal: number;
  volumePoints: number;
  caps: string[];
}

// MAANG-meter axis weights. Must sum to 1.
const W = { coverage: 0.25, volume: 0.2, retention: 0.2, hard: 0.15, mock: 0.1, design: 0.1 };

function computeMaangMeter(
  stats: Stats,
  corePatterns: string[],
  extras: Extras,
): MaangMeter {
  // Coverage: per-pattern mastery weight = min(count/3, 1). Need 3+ problems per pattern to fully count.
  const coverageSum = corePatterns.reduce((acc, p) => acc + Math.min((stats.byPattern[p] ?? 0) / 3, 1), 0);
  const coverage = coverageSum / corePatterns.length;
  const patternsHit = corePatterns.filter((p) => (stats.byPattern[p] ?? 0) > 0).length;

  // Volume: weighted points, cap at 1500 (MAANG-ready bar ~ 300M + 50H = 1150).
  const volumePoints =
    stats.byDifficulty.Easy * 1 + stats.byDifficulty.Medium * 3 + stats.byDifficulty.Hard * 5;
  const volume = Math.min(volumePoints / 1500, 1);

  // Retention-health: on-time review rate over 30d, or null when the sample is too thin.
  const retention = extras.onTimeRate;

  const totalKnown = stats.byDifficulty.Easy + stats.byDifficulty.Medium + stats.byDifficulty.Hard;
  const hardFraction = totalKnown > 0 ? stats.byDifficulty.Hard / totalKnown : 0;
  const hardRatio = Math.min(hardFraction / 0.3, 1);

  const mockReadiness = Math.min(extras.mockLast30 / MOCK_TARGET, 1);
  const designReadiness = Math.min(extras.designsDone / DESIGN_TARGET, 1);

  // Weighted sum. When retention is n/a, drop its weight and rescale the rest to re-sum to 1.
  let score: number;
  if (retention === null) {
    const denom = W.coverage + W.volume + W.hard + W.mock + W.design; // 0.80
    score =
      (W.coverage * coverage +
        W.volume * volume +
        W.hard * hardRatio +
        W.mock * mockReadiness +
        W.design * designReadiness) /
      denom;
  } else {
    score =
      W.coverage * coverage +
      W.volume * volume +
      W.retention * retention +
      W.hard * hardRatio +
      W.mock * mockReadiness +
      W.design * designReadiness;
  }

  // Honest caps — MAANG bar requires breadth, depth, hards, and (late) system design.
  // Only record a cap as "applied" if it actively reduced the score.
  const caps: string[] = [];
  if (stats.byDifficulty.Hard === 0 && score > 0.3) {
    score = 0.3;
    caps.push('Hard count = 0 (cap 30%)');
  }
  if (stats.total < 50 && score > 0.25) {
    score = 0.25;
    caps.push('Total < 50 problems (cap 25%)');
  }
  if (extras.designsDone === 0 && extras.week > 8 && score > 0.5) {
    score = 0.5;
    caps.push('0 designs after week 8 (cap 50%)');
  }

  return {
    score,
    coverage,
    volume,
    retention,
    hardRatio,
    mockReadiness,
    designReadiness,
    patternsHit,
    patternsTotal: corePatterns.length,
    volumePoints,
    caps,
  };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function bar(x: number, y: number, w: number, h: number, color: string, opacity = 1): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${color}" opacity="${opacity}"/>`;
}

function text(x: number, y: number, s: string, opts: { size?: number; color?: string; weight?: number; anchor?: string } = {}): string {
  const { size = 12, color = COLORS.text, weight = 400, anchor = 'start' } = opts;
  return `<text x="${x}" y="${y}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${escapeXml(s)}</text>`;
}

/** Draw one KPI card. Label size is configurable so longer labels (phase names) still fit. */
function kpiCard(x: number, y: number, w: number, val: string, label: string, color: string, labelSize = 11): string[] {
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="74" rx="6" fill="${COLORS.panel}" stroke="${COLORS.border}"/>`,
    text(x + 14, y + 36, val, { size: 26, weight: 700, color }),
    text(x + 14, y + 58, label, { size: labelSize, color: COLORS.textMuted }),
  ];
}

function renderSvg(stats: Stats, meter: MaangMeter, extras: Extras, generatedAt: string): string {
  const W_SVG = 900;
  const body: string[] = [];

  // Header
  body.push(text(24, 36, 'Junaki · Prep Stats', { size: 22, weight: 700 }));
  body.push(text(24, 56, `Updated ${generatedAt} • ${stats.total} problems, ${stats.totalPractices} practice sessions`, { size: 11, color: COLORS.textMuted }));

  // KPI row 1 (existing)
  const kpiY = 80;
  const kpiH = 74;
  const kpiW = (W_SVG - 48 - 24) / 4;
  const cardX = (i: number) => 24 + i * (kpiW + 8);
  const row1: Array<[string, string, string]> = [
    [String(stats.total), 'Problems Solved', COLORS.accent],
    [String(stats.totalPractices), 'Practice Sessions', COLORS.good],
    [String(meter.patternsHit) + '/' + meter.patternsTotal, 'Patterns Covered', COLORS.medium],
    [(meter.score * 100).toFixed(0) + '%', 'MAANG Meter', COLORS.meter],
  ];
  row1.forEach(([val, label, color], i) => body.push(...kpiCard(cardX(i), kpiY, kpiW, val, label, color)));

  // KPI row 2 (new)
  const kpiY2 = kpiY + kpiH + 8;
  const onTimeVal = extras.onTimeRate === null ? 'n/a' : (extras.onTimeRate * 100).toFixed(0) + '%';
  const weekVal = extras.curriculum ? `Wk ${extras.week < 1 ? 0 : extras.week}` : '—';
  const phaseLabel = extras.phase
    ? `P${extras.phase.id} · ${extras.phase.name.split('·').pop()!.trim()}`
    : extras.curriculum
      ? 'pre-start'
      : 'no curriculum';
  body.push(...kpiCard(cardX(0), kpiY2, kpiW, String(extras.reviewsDueToday), 'Reviews Due Today', COLORS.accent));
  body.push(...kpiCard(cardX(1), kpiY2, kpiW, onTimeVal, 'On-Time Reviews 30d', COLORS.good));
  body.push(...kpiCard(cardX(2), kpiY2, kpiW, weekVal, phaseLabel, COLORS.medium, 10));
  body.push(...kpiCard(cardX(3), kpiY2, kpiW, `${extras.curriculumDone}/${extras.curriculumTotal}`, 'Curriculum Items', COLORS.meter));

  // Section: Portals
  let y = kpiY2 + kpiH + 28;
  body.push(text(24, y, 'BY PORTAL', { size: 11, weight: 700, color: COLORS.textMuted }));
  y += 16;
  const maxPortal = Math.max(1, ...Object.values(stats.byPortal));
  for (const portal of PORTALS) {
    const count = stats.byPortal[portal];
    const barW = ((W_SVG - 240) * count) / maxPortal;
    body.push(text(24, y + 12, portal, { size: 12 }));
    body.push(bar(140, y, W_SVG - 240, 16, COLORS.panel));
    if (count > 0) body.push(bar(140, y, barW, 16, COLORS.accent));
    body.push(text(W_SVG - 24, y + 12, String(count), { size: 12, anchor: 'end', color: COLORS.text }));
    y += 22;
  }

  // Section: Curriculum by source (solved/total over the multi-platform plan)
  const srcOrder = ['leetcode', 'geeksforgeeks', 'hackerrank', 'interviewbit', 'codeforces', 'custom'];
  const srcPresent = srcOrder.filter((s) => extras.curriculumBySource[s]);
  if (srcPresent.length > 0) {
    y += 12;
    body.push(text(24, y, 'CURRICULUM BY SOURCE', { size: 11, weight: 700, color: COLORS.textMuted }));
    y += 16;
    const maxSrc = Math.max(1, ...srcPresent.map((s) => extras.curriculumBySource[s].total));
    for (const s of srcPresent) {
      const { done, total } = extras.curriculumBySource[s];
      const fullW = ((W_SVG - 240) * total) / maxSrc;
      const doneW = ((W_SVG - 240) * done) / maxSrc;
      body.push(text(24, y + 12, s, { size: 12 }));
      body.push(bar(140, y, W_SVG - 240, 16, COLORS.panel));
      if (total > 0) body.push(bar(140, y, fullW, 16, COLORS.border));
      if (done > 0) body.push(bar(140, y, doneW, 16, COLORS.good));
      body.push(text(W_SVG - 24, y + 12, `${done}/${total}`, { size: 12, anchor: 'end', color: COLORS.text }));
      y += 22;
    }
  }

  // Section: Difficulty
  y += 12;
  body.push(text(24, y, 'BY DIFFICULTY', { size: 11, weight: 700, color: COLORS.textMuted }));
  y += 16;
  const diffOrder: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Unknown'];
  const diffColor: Record<Difficulty, string> = {
    Easy: COLORS.easy,
    Medium: COLORS.medium,
    Hard: COLORS.hard,
    Unknown: COLORS.unknown,
  };
  const stackX = 24;
  const stackW = W_SVG - 48;
  const stackH = 18;
  let cursor = stackX;
  body.push(bar(stackX, y, stackW, stackH, COLORS.panel));
  for (const d of diffOrder) {
    const c = stats.byDifficulty[d];
    if (c === 0) continue;
    const w = (stackW * c) / Math.max(1, stats.total);
    body.push(bar(cursor, y, w, stackH, diffColor[d]));
    cursor += w;
  }
  y += stackH + 18;
  let lx = 24;
  for (const d of diffOrder) {
    const c = stats.byDifficulty[d];
    body.push(`<rect x="${lx}" y="${y - 10}" width="10" height="10" rx="2" fill="${diffColor[d]}"/>`);
    body.push(text(lx + 16, y, `${d} ${c}`, { size: 11, color: COLORS.textMuted }));
    lx += 100;
  }
  y += 12;

  // Section: Top categories (left) + Top patterns (right)
  y += 14;
  const colW = (W_SVG - 48 - 16) / 2;
  body.push(text(24, y, 'TOP CATEGORIES', { size: 11, weight: 700, color: COLORS.textMuted }));
  body.push(text(24 + colW + 16, y, 'TOP PATTERNS', { size: 11, weight: 700, color: COLORS.textMuted }));
  y += 16;

  const catEntries = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const patEntries = Object.entries(stats.byPattern).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = catEntries.length ? catEntries[0][1] : 1;
  const maxPat = patEntries.length ? patEntries[0][1] : 1;

  const labelW = 140;
  const rowsToDraw = Math.max(catEntries.length, patEntries.length, 1);
  for (let i = 0; i < rowsToDraw; i++) {
    const ry = y + i * 22;
    if (catEntries[i]) {
      const [name, count] = catEntries[i];
      const innerW = colW - labelW - 30;
      body.push(text(24, ry + 12, name, { size: 11 }));
      body.push(bar(24 + labelW, ry, innerW, 14, COLORS.panel));
      body.push(bar(24 + labelW, ry, (innerW * count) / maxCat, 14, COLORS.accent));
      body.push(text(24 + colW - 4, ry + 12, String(count), { size: 11, anchor: 'end' }));
    }
    if (patEntries[i]) {
      const [name, count] = patEntries[i];
      const baseX = 24 + colW + 16;
      const innerW = colW - labelW - 30;
      body.push(text(baseX, ry + 12, name, { size: 11 }));
      body.push(bar(baseX + labelW, ry, innerW, 14, COLORS.panel));
      body.push(bar(baseX + labelW, ry, (innerW * count) / maxPat, 14, COLORS.meter));
      body.push(text(baseX + colW - 4, ry + 12, String(count), { size: 11, anchor: 'end' }));
    }
  }
  y += rowsToDraw * 22 + 14;

  // Section: Tracks
  y += 4;
  body.push(text(24, y, 'TRACKS', { size: 11, weight: 700, color: COLORS.textMuted }));
  y += 16;
  const m = extras.mockTotals;
  const trackParts = [
    `System designs ${extras.designsDone}/${DESIGN_TARGET}`,
    `Behavioral stories ${extras.storiesDrilled}`,
    `Mocks  OA ${m['mock-oa']} · Staged ${m['mock-staged']} · AI ${m['mock-ai']}`,
  ];
  body.push(text(24, y + 4, trackParts.join('      ·      '), { size: 12 }));
  y += 24;

  // Section: 26-week roadmap timeline
  y += 6;
  body.push(text(24, y, 'CURRICULUM ROADMAP', { size: 11, weight: 700, color: COLORS.textMuted }));
  y += 16;
  const tlX = 24;
  const tlW = W_SVG - 48;
  const tlH = 22;
  if (extras.curriculum && extras.curriculum.phases.length > 0) {
    const phases = extras.curriculum.phases;
    const totalWeeks = parseWeekRange(phases[phases.length - 1].weeks)[1] || 26;
    let segX = tlX;
    phases.forEach((ph, i) => {
      const [start, end] = parseWeekRange(ph.weeks);
      const span = end - start + 1;
      const segW = (tlW * span) / totalWeeks;
      const isCurrent = extras.week >= start && extras.week <= end;
      body.push(bar(segX, y, Math.max(segW - 2, 1), tlH, PHASE_COLORS[i % PHASE_COLORS.length], isCurrent ? 0.95 : 0.4));
      body.push(text(segX + 5, y + 15, `P${ph.id}`, { size: 10, weight: 700, color: COLORS.bg }));
      segX += segW;
    });
    // "you are here" marker
    const wk = Math.max(0, Math.min(extras.week, totalWeeks));
    const markerX = tlX + (tlW * wk) / totalWeeks;
    body.push(`<line x1="${markerX}" y1="${y - 5}" x2="${markerX}" y2="${y + tlH + 5}" stroke="${COLORS.text}" stroke-width="2"/>`);
    const frac = wk / totalWeeks;
    const anchor = frac < 0.12 ? 'start' : frac > 0.88 ? 'end' : 'middle';
    body.push(text(markerX, y + tlH + 16, `▲ you are here · wk ${extras.week < 1 ? 0 : extras.week}`, { size: 10, color: COLORS.accent, anchor }));
    y += tlH + 26;
  } else {
    body.push(text(24, y + 14, 'curriculum.json not found', { size: 11, color: COLORS.textMuted }));
    y += 26;
  }

  // Section: MAANG Meter
  y += 6;
  body.push(text(24, y, 'MAANG INTERVIEW READINESS', { size: 11, weight: 700, color: COLORS.textMuted }));
  y += 16;

  const meterX = 24;
  const meterW = W_SVG - 48;
  const meterH = 22;
  body.push(bar(meterX, y, meterW, meterH, COLORS.panel));
  body.push(bar(meterX, y, meterW * meter.score, meterH, COLORS.meter));
  body.push(text(meterX + 8, y + 15, `${(meter.score * 100).toFixed(1)}%`, { size: 12, weight: 700 }));
  const verdict =
    meter.score >= 0.8 ? 'MAANG-ready' :
    meter.score >= 0.6 ? 'Strong candidate' :
    meter.score >= 0.4 ? 'Building momentum' :
    meter.score >= 0.2 ? 'Early stage' : 'Just getting started';
  body.push(text(meterX + meterW - 8, y + 15, verdict, { size: 11, anchor: 'end', color: COLORS.textMuted }));
  y += meterH + 12;

  const retentionDetail = meter.retention === null ? 'n/a' : `${extras.onTime.onTime}/${extras.onTime.total}`;
  const retentionLabel = `Retention-health (on-time 30d, ${retentionDetail})`;
  const subs: Array<[string, number | null, string]> = [
    [`Coverage (${meter.patternsHit}/${meter.patternsTotal} patterns)`, meter.coverage, '25%'],
    [`Volume (${meter.volumePoints} pts / 1500)`, meter.volume, '20%'],
    [retentionLabel, meter.retention, '20%'],
    [`Hard ratio (target 30%)`, meter.hardRatio, '15%'],
    [`Mock-readiness (last 30d / ${MOCK_TARGET})`, meter.mockReadiness, '10%'],
    [`Design-readiness (done / ${DESIGN_TARGET})`, meter.designReadiness, '10%'],
  ];
  for (const [label, value, weight] of subs) {
    body.push(text(24, y + 11, label, { size: 11 }));
    body.push(text(24 + 290, y + 11, weight, { size: 10, color: COLORS.textMuted }));
    const subW = W_SVG - 24 - (24 + 340);
    body.push(bar(24 + 340, y + 1, subW, 12, COLORS.panel));
    if (value === null) {
      body.push(text(W_SVG - 24, y + 11, 'n/a', { size: 11, anchor: 'end', color: COLORS.textMuted }));
    } else {
      body.push(bar(24 + 340, y + 1, subW * value, 12, COLORS.meter, 0.85));
      body.push(text(W_SVG - 24, y + 11, `${(value * 100).toFixed(0)}%`, { size: 11, anchor: 'end' }));
    }
    y += 18;
  }

  if (meter.caps.length > 0) {
    y += 4;
    body.push(text(24, y + 10, `Caps applied: ${meter.caps.join(' • ')}`, { size: 10, color: COLORS.hard }));
    y += 10;
  }

  // Assemble with a height that fits the content.
  const H = Math.ceil(y + 20);
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W_SVG}" height="${H}" viewBox="0 0 ${W_SVG} ${H}">`);
  parts.push(`<rect width="${W_SVG}" height="${H}" fill="${COLORS.bg}"/>`);
  parts.push(`<rect x="1" y="1" width="${W_SVG - 2}" height="${H - 2}" fill="none" stroke="${COLORS.border}" rx="8"/>`);
  parts.push(...body);
  parts.push(`</svg>`);
  return parts.join('\n');
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

function main(): void {
  const now = new Date();
  const meta = loadMeta();
  const practice = loadPractice();
  const schedule = loadSchedule();
  const curriculum = loadCurriculum();

  const records = gatherProblems(meta, practice);
  const stats = computeStats(records);

  // Reviews due: count by end of today, reusing dueReviews.
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const reviewsDueToday = dueReviews(schedule, endOfToday).length;

  // On-time review rate over 30d; n/a when too few samples.
  const resolve = (f: string) => resolveCanonical(f, meta);
  const onTime = onTimeInWindow(reviewHistory(practice, resolve), now, 30);
  const onTimeRate = onTime.total < RETENTION_MIN_SAMPLE ? null : onTime.onTime / onTime.total;

  // Curriculum phase/week and progress over all items.
  const practiced = indexPracticedFiles(new Set(practice.map((e) => e.file)));
  const week = curriculum?.startDate ? weekNumber(curriculum.startDate, now) : 0;
  const phase = curriculum ? currentPhase(curriculum.phases, week) : undefined;
  const curriculumTotal = curriculum?.items.length ?? 0;
  const curriculumDone = curriculum ? curriculum.items.filter((it) => isItemDone(it, practiced)).length : 0;

  // Per-source progress over the multi-platform curriculum (problem items only).
  // Items written before the `source` field count as leetcode.
  const curriculumBySource: Record<string, { done: number; total: number }> = {};
  for (const it of curriculum?.items ?? []) {
    if (it.kind !== 'problem') continue;
    const src = it.source ?? 'leetcode';
    const entry = (curriculumBySource[src] ??= { done: 0, total: 0 });
    entry.total++;
    if (isItemDone(it, practiced)) entry.done++;
  }

  // Tracks.
  const designsDone = countTrackFiles('systemdesign', ['_template.md', 'README.md']);
  const storiesDrilled = countTrackFiles(join('behavioral', 'stories'), ['_template.md']);
  const mockTotals = countMocks(practice);
  const mockLast30Counts = countMocks(practice, 30);
  const mockLast30 = MOCK_MODES.reduce((acc, mode) => acc + mockLast30Counts[mode], 0);

  const extras: Extras = {
    reviewsDueToday,
    onTime,
    onTimeRate,
    curriculum,
    week,
    phase,
    curriculumDone,
    curriculumTotal,
    curriculumBySource,
    designsDone,
    storiesDrilled,
    mockTotals,
    mockLast30,
  };

  const meter = computeMaangMeter(stats, meta.corePatterns, extras);
  const svg = renderSvg(stats, meter, extras, fmtDate(now));
  writeFileSync(join(ROOT, 'stats.svg'), svg);

  console.log(
    `stats.svg written. ${stats.total} problems, ${stats.totalPractices} practice sessions, ` +
      `MAANG ${(meter.score * 100).toFixed(1)}%. Reviews due ${reviewsDueToday}, ` +
      `curriculum ${curriculumDone}/${curriculumTotal}, designs ${designsDone}/${DESIGN_TARGET}.`,
  );
  if (stats.unknownMetadata > 0) {
    const missing = records.filter((r) => r.difficulty === 'Unknown').map((r) => r.file);
    console.warn(`\n${stats.unknownMetadata} problems missing metadata in data/problems-meta.json:`);
    for (const f of missing) console.warn(`  - ${f}`);
  }
}

main();
