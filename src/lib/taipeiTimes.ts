import * as cheerio from "cheerio";

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  date: string; // YYYY/MM/DD
  page: number | null; // print edition page number, if known
};

export type Section = {
  slug: string;
  name: string;
  path: string;
};

export const SECTIONS: Section[] = [
  { slug: "front", name: "頭版 Front Page", path: "/News/front" },
  { slug: "taiwan", name: "台灣新聞 Taiwan News", path: "/News/taiwan" },
  { slug: "biz", name: "財經新聞 Business", path: "/News/biz" },
  { slug: "editorials", name: "社論廣場 Editorials & Opinion", path: "/News/editorials" },
  { slug: "sport", name: "體育新聞 Sports", path: "/News/sport" },
  { slug: "world", name: "國際新聞 World News", path: "/News/world" },
  { slug: "feat", name: "特別報導 Features", path: "/News/feat" },
  { slug: "lang", name: "雙語新聞 Bilingual Pages", path: "/News/lang" },
];

const BASE_URL = "https://www.taipeitimes.com";
const PAGE_STAMP_RE = /page\s*(\d+)/i;
const CANONICAL_RE =
  /taipeitimes\.com\/News\/([a-zA-Z]+)\/archives\/(\d{4})\/(\d{2})\/(\d{2})\/(\d+)/;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Roughly how many articles (across all sections) the site publishes per day.
// Only used to seed the search below; accuracy doesn't matter much since the
// search corrects itself from real observed dates as it goes.
const ESTIMATED_IDS_PER_DAY = 55;

export function todayInTaipei(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")}`;
}

// Accepts "YYYY-MM-DD" or "YYYY/MM/DD" and normalizes to "YYYY/MM/DD".
export function parseDateParam(input: string): string | null {
  const match = input.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return `${year}/${month}/${day}`;
}

function daysBetween(a: string, b: string): number {
  const toUTC = (d: string) => {
    const [y, m, day] = d.split("/").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toUTC(a) - toUTC(b)) / 86_400_000);
}

type ArticleInfo = {
  id: string;
  title: string;
  url: string;
  date: string; // YYYY/MM/DD
  sectionSlug: string;
  page: number | null;
};

// The site resolves an article purely by its trailing numeric ID and
// redirects to the canonical /News/{section}/archives/{y}/{m}/{d}/{id} URL
// regardless of what section/date is in the probe URL. That lets us look up
// any article (and discover its real section + date) from just its ID.
async function fetchArticleById(
  id: number,
  revalidate: number
): Promise<ArticleInfo | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/News/front/archives/2000/01/01/${id}`,
      {
        headers: { "User-Agent": USER_AGENT },
        next: { revalidate },
      }
    );
    if (!res.ok) {
      console.error(`[taipeiTimes] id=${id} fetch not ok: status=${res.status} url=${res.url}`);
      return null;
    }

    const m = res.url.match(CANONICAL_RE);
    if (!m) {
      console.error(`[taipeiTimes] id=${id} no canonical match: finalUrl=${res.url}`);
      return null;
    }
    const [, sectionSlug, year, month, day, realId] = m;

    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("div.archives h1").first().text().trim();
    if (!title) {
      console.error(`[taipeiTimes] id=${id} no title found: finalUrl=${res.url} htmlLength=${html.length}`);
      return null;
    }

    const stamp = $("div.where").next("h6").text();
    const pageMatch = stamp.match(PAGE_STAMP_RE);

    return {
      id: realId,
      title,
      url: res.url,
      date: `${year}/${month}/${day}`,
      sectionSlug,
      page: pageMatch ? Number(pageMatch[1]) : null,
    };
  } catch (err) {
    console.error(`[taipeiTimes] id=${id} fetch threw:`, err);
    return null;
  }
}

// Finds one article ID published on `date` by interpolating from a known
// (anchorId, anchorDate) pair, correcting the guess against real observed
// dates each step. Falls back to nothing if the date has no news or is out
// of the site's range.
async function findWitnessId(
  date: string,
  anchorId: number,
  anchorDate: string,
  revalidate: number
): Promise<ArticleInfo | null> {
  let guess = anchorId;
  let knownDate = anchorDate;
  let knownId = anchorId;

  for (let attempt = 0; attempt < 25; attempt++) {
    const info = await fetchArticleById(guess, revalidate);

    if (!info) {
      // Missing ID: nudge toward the last known-good point and keep trying.
      guess += guess < knownId ? 1 : -1;
      continue;
    }

    if (info.date === date) return info;

    knownId = guess;
    knownDate = info.date;

    const diffDays = daysBetween(date, info.date); // >0 => target is later
    if (diffDays === 0) {
      // Same date bucket somehow didn't match string-for-string; bail.
      return null;
    }
    const step = Math.max(1, Math.round(Math.abs(diffDays) * ESTIMATED_IDS_PER_DAY));
    guess += diffDays > 0 ? step : -step;

    // If we overshoot past where we've already been without narrowing,
    // clamp the step so we don't oscillate forever.
    if (guess === knownId) guess += diffDays > 0 ? 1 : -1;
  }

  return knownDate === date ? null : null;
}

async function scanDirection(
  startId: number,
  direction: 1 | -1,
  date: string,
  revalidate: number,
  maxMisses: number
): Promise<ArticleInfo[]> {
  const BATCH_SIZE = 10;
  const MAX_BATCHES = 20;

  const results: ArticleInfo[] = [];
  let misses = 0;
  let cursor = startId;

  for (let batch = 0; batch < MAX_BATCHES && misses < maxMisses; batch++) {
    const ids = Array.from({ length: BATCH_SIZE }, (_, i) => cursor + direction * (i + 1));
    const infos = await Promise.all(ids.map((id) => fetchArticleById(id, revalidate)));

    let stop = false;
    for (const info of infos) {
      if (!info) {
        misses++;
        if (misses >= maxMisses) {
          stop = true;
          break;
        }
        continue;
      }
      misses = 0;
      if (info.date !== date) {
        stop = true;
        break;
      }
      results.push(info);
    }

    cursor += direction * BATCH_SIZE;
    if (stop) break;
  }

  return results;
}

async function findAnchor(revalidate: number): Promise<{ id: number; date: string } | null> {
  try {
    const res = await fetch(`${BASE_URL}/News/front`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    let match: RegExpMatchArray | null = null;
    for (const el of $("a[data-desc][href]").toArray()) {
      const href = $(el).attr("href") ?? "";
      const m = href.match(/\/archives\/(\d{4})\/(\d{2})\/(\d{2})\/(\d+)/);
      if (m) {
        match = m;
        break;
      }
    }
    if (!match) return null;
    const [, year, month, day, id] = match;
    return { id: Number(id), date: `${year}/${month}/${day}` };
  } catch {
    return null;
  }
}

export async function fetchAllSectionsNewsForDate(date: string) {
  const isToday = date === todayInTaipei();
  const revalidate = isToday ? 300 : 86400;
  // Today's articles publish incrementally, so a not-yet-published ID can
  // look like a gap even though more news for today follows it. Tolerate a
  // longer run of misses for today; for past dates a run of misses reliably
  // means we've reached the boundary of that day's articles.
  const maxMisses = isToday ? 15 : 3;
  const empty = SECTIONS.map((section) => ({ section, items: [] as NewsItem[] }));

  const anchor = await findAnchor(revalidate);
  if (!anchor) return empty;

  const witness = await findWitnessId(date, anchor.id, anchor.date, revalidate);
  if (!witness) return empty;

  const [before, after] = await Promise.all([
    scanDirection(Number(witness.id), -1, date, revalidate, maxMisses),
    scanDirection(Number(witness.id), 1, date, revalidate, maxMisses),
  ]);

  const all = [...before, witness, ...after];
  const bySlug = new Map<string, NewsItem[]>();
  for (const info of all) {
    const list = bySlug.get(info.sectionSlug) ?? [];
    list.push({
      id: info.id,
      title: info.title,
      url: info.url,
      date: info.date,
      page: info.page,
    });
    bySlug.set(info.sectionSlug, list);
  }

  const results = SECTIONS.map((section) => {
    const items = (bySlug.get(section.slug) ?? []).slice();
    items.sort((a, b) => comparePage(a.page, b.page) || Number(a.id) - Number(b.id));
    return { section, items };
  });

  // Sections are ordered by their lowest print page number that day (the
  // section covering the earliest page comes first), preserving the
  // original SECTIONS order for ties or sections with no page info.
  results.sort((a, b) => comparePage(a.items[0]?.page ?? null, b.items[0]?.page ?? null));

  return results;
}

function comparePage(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}
