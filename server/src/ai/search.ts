/**
 * Krittim Research Engine — the web-search backbone.
 *
 * Goal: answer "fresh" questions with grounded, cited context — the way
 * Perplexity/Claude browse, but self-contained (no paid API). Pipeline:
 *
 *   1. needsSearch()      — decide if a question even needs the web
 *   2. planQueries()      — turn the message into clean search terms
 *   3. ddgSearch()        — fetch ranked results (DuckDuckGo HTML)
 *   4. fetchReadable()    — pull + de-HTML the top pages for real substance
 *   5. research()         — assemble numbered sources + a context block the
 *                           model is instructed to cite as [1] [2] …
 *
 * Every network call is bounded by a timeout so a slow site can never hang a
 * stream. Dependency-free on purpose (no cheerio) to stay light.
 */

export interface SearchSource {
  index: number;
  title: string;
  url: string;
  snippet: string;
}

export interface ResearchResult {
  sources: SearchSource[];
  context: string;
}

const UA =
  'Mozilla/5.0 (compatible; KrittimResearch/1.0; +https://krittim.ai) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

/* ----------------------------- text helpers ----------------------------- */

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)));
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pull the real destination out of a DuckDuckGo redirect wrapper. */
function unwrapDDG(href: string): string {
  const match = /[?&]uddg=([^&]+)/.exec(href);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      /* fall through */
    }
  }
  if (href.startsWith('//')) return `https:${href}`;
  return href;
}

/* --------------------------- search heuristics -------------------------- */

const FRESH_SIGNALS = [
  'latest', 'recent', 'today', 'this week', 'this month', 'this year', 'now',
  'current', 'currently', 'news', 'update', 'updates', 'price', 'stock',
  'weather', 'score', 'release', 'released', 'version', 'changelog',
  'who won', 'election', 'trending', 'best', 'top ', 'vs ', 'compare',
  '2024', '2025', '2026', '2027',
];

/** Should this message hit the web even if the user didn't toggle it on? */
export function needsSearch(message: string): boolean {
  const t = message.toLowerCase().trim();
  if (!t) return false;
  if (/(^|\s)(search|google|look up|browse)(\s|$)/.test(t)) return true;
  if (/https?:\/\//.test(t)) return true;
  return FRESH_SIGNALS.some((signal) => t.includes(signal));
}

/** Reduce a chatty prompt to tight search terms (best-effort, 1 query). */
export function planQueries(message: string): string[] {
  let q = message
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^(please\s+)?(can you\s+)?(search|google|look up|find|tell me|what is|whats|what\'s|who is|explain)\b[:,\s]*/i, ' ')
    .replace(/\b(the web|online|for me|right now|currently)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (q.length > 220) q = q.slice(0, 220).trimEnd();
  return q ? [q] : [message.trim().slice(0, 220)];
}

/* ------------------------------- fetching ------------------------------- */

async function ddgSearch(query: string, max = 6): Promise<SearchSource[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`search provider HTTP ${res.status}`);
  const html = await res.text();

  const anchors = [...html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  const snippets = [...html.matchAll(/<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];

  const sources: SearchSource[] = [];
  for (let i = 0; i < anchors.length && sources.length < max; i++) {
    const href = unwrapDDG(decodeEntities(anchors[i][1]));
    const title = decodeEntities(stripTags(anchors[i][2]));
    const snippet = snippets[i] ? decodeEntities(stripTags(snippets[i][1])) : '';
    if (!href.startsWith('http')) continue;
    sources.push({ index: sources.length + 1, title: title || href, url: href, snippet });
  }
  return sources;
}

async function fetchReadable(url: string, maxChars = 1600): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(9000),
      redirect: 'follow',
    });
    if (!res.ok) return '';
    const contentType = res.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml/i.test(contentType)) return '';
    const html = await res.text();
    return stripTags(html).slice(0, maxChars);
  } catch {
    return '';
  }
}

/* ------------------------------ orchestrate ----------------------------- */

export async function research(rawMessage: string, maxPages = 3): Promise<ResearchResult> {
  const [query] = planQueries(rawMessage);
  const results = await ddgSearch(query, 6);
  if (!results.length) return { sources: [], context: '' };

  const top = results.slice(0, maxPages);
  const enriched = await Promise.all(
    top.map(async (r, i) => {
      const text = await fetchReadable(r.url);
      return { ...r, index: i + 1, text: text || r.snippet };
    }),
  );

  const sources: SearchSource[] = enriched.map((r) => ({
    index: r.index,
    title: r.title,
    url: r.url,
    snippet: r.snippet,
  }));

  const context = enriched
    .map((r) => `[${r.index}] ${r.title} — ${r.url}\n${r.text}`)
    .join('\n\n');

  return { sources, context };
}
