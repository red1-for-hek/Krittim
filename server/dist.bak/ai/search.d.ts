/**
 * Krittim Research Engine — the web-search backbone.
 *
 * Goal: answer "fresh" questions with grounded, cited context — the way
 * Perplexity/Claude browse, but self-contained (no paid API). Pipeline:
 *
 *   1. needsSearch()      — decide if a question even needs the web
 *   2. planQueries()      — turn the message into clean search terms
 *   3. searchWeb()        — DuckDuckGo → Bing fallback (ranked results)
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
/** Should this message hit the web even if the user didn't toggle it on? */
export declare function needsSearch(message: string): boolean;
/** Reduce a chatty prompt to tight search terms (best-effort, 1 query). */
export declare function planQueries(message: string): string[];
/** Try DDG first, fall back to Bing if DDG is blocked or returns nothing. */
export declare function searchWeb(query: string, max?: number): Promise<SearchSource[]>;
export declare function research(rawMessage: string, maxPages?: number): Promise<ResearchResult>;
