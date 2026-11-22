'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  ImagePlus,
  Loader2,
  Play,
  RefreshCw,
  Terminal,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import AnimatedMeshBackground from '@/components/layout/AnimatedMeshBackground';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getApiBaseUrl } from '@/store/authStore';

interface ProviderInfo {
  id: string;
  label: string;
  group: 'xKiro' | 'Groq' | 'Apinex';
  envVar: string;
  endpointType: 'chat' | 'image';
  baseUrl: string;
  defaultModel: string;
  configured: boolean;
}

interface TestResult {
  ok: boolean;
  providerId: string;
  endpointType: 'chat' | 'image';
  modelUsed: string;
  httpStatus: number | null;
  latencyMs: number;
  output?: string;
  imageUrl?: string;
  error?: string;
  rawPreview?: string;
}

export default function TestModelPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [chatPrompt, setChatPrompt] = useState(
    'Reply with OK and identify your model name in one short sentence.',
  );
  const [imagePrompt, setImagePrompt] = useState(
    'A minimal emerald glass hexagon floating on soft slate-green mist, studio lighting',
  );
  const [modelOverrides, setModelOverrides] = useState<Record<string, string>>({});
  const [runningIds, setRunningIds] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [runningAll, setRunningAll] = useState(false);

  const loadProviders = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/testmodel/providers`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { providers?: ProviderInfo[] };
      setProviders(data.providers ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load provider slots');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/testmodel/providers`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { providers?: ProviderInfo[] };
        if (!cancelled) setProviders(data.providers ?? []);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load provider slots');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSingleTest = async (provider: ProviderInfo): Promise<TestResult | null> => {
    setRunningIds((prev) => ({ ...prev, [provider.id]: true }));
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/testmodel/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider.id,
          prompt: provider.endpointType === 'image' ? imagePrompt : chatPrompt,
          modelOverride: modelOverrides[provider.id]?.trim() || undefined,
        }),
      });
      const data = (await res.json()) as TestResult;
      setResults((prev) => ({ ...prev, [provider.id]: data }));
      return data;
    } catch (err) {
      const fallbackErr: TestResult = {
        ok: false,
        providerId: provider.id,
        endpointType: provider.endpointType,
        modelUsed: modelOverrides[provider.id] || provider.defaultModel,
        httpStatus: null,
        latencyMs: 0,
        error: err instanceof Error ? err.message : 'Network error',
      };
      setResults((prev) => ({ ...prev, [provider.id]: fallbackErr }));
      return fallbackErr;
    } finally {
      setRunningIds((prev) => ({ ...prev, [provider.id]: false }));
    }
  };

  const runAllConfigured = async () => {
    const targets = providers.filter((p) => p.configured);
    if (targets.length === 0) {
      toast.error('No API keys configured in runtime environment');
      return;
    }
    setRunningAll(true);
    let passed = 0;
    for (const provider of targets) {
      const res = await runSingleTest(provider);
      if (res?.ok) passed += 1;
    }
    setRunningAll(false);
    toast.success(`Completed ${targets.length} tests: ${passed} passed, ${targets.length - passed} failed`);
  };

  const configuredCount = providers.filter((p) => p.configured).length;

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <AnimatedMeshBackground />

      <header className="glass-bar sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push('/')}
            aria-label="Back to chat"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <ArrowLeft className="size-5" strokeWidth={1.9} />
          </button>
          <div className="flex items-center gap-2">
            <FlaskConical className="size-4 text-brand" strokeWidth={1.9} />
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Model & Key Diagnostics
            </h1>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              · Direct single-key test · Zero fallback
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadProviders()}
            disabled={loadingList || runningAll}
            className="whitespace-nowrap rounded-xl border-hairline bg-surface text-xs"
          >
            <RefreshCw className={cn('size-3.5', loadingList && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void runAllConfigured()}
            disabled={loadingList || runningAll || configuredCount === 0}
            className="whitespace-nowrap rounded-xl bg-gradient-to-br from-brand to-brand-soft text-xs text-white hover:brightness-110"
          >
            {runningAll ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            Test All Configured ({configuredCount})
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 md:px-8 md:py-8">
        {/* Prompt configuration */}
        <section className="glass-panel rounded-2xl p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Diagnostic Prompts</h2>
              <p className="text-xs text-muted-foreground">
                Each test calls ONLY the selected key and endpoint directly with no provider or Pollinations fallback.
              </p>
            </div>
            <div className="font-mono text-xs tabular-nums text-muted-foreground">
              {configuredCount}/{providers.length} env keys detected
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="chat-test-prompt" className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Terminal className="size-3.5 text-brand" />
                Chat completion prompt
              </label>
              <input
                id="chat-test-prompt"
                type="text"
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                className="h-10 w-full rounded-xl border border-hairline bg-surface-soft px-3 text-xs text-foreground outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="image-test-prompt" className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <ImagePlus className="size-3.5 text-brand" />
                Image generation prompt
              </label>
              <input
                id="image-test-prompt"
                type="text"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="h-10 w-full rounded-xl border border-hairline bg-surface-soft px-3 text-xs text-foreground outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20"
              />
            </div>
          </div>
        </section>

        {/* Provider Slots Grid */}
        {loadingList ? (
          <div className="glass-panel flex items-center justify-center gap-3 rounded-2xl p-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-brand" />
            Checking configured environment keys…
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {providers.map((provider) => {
              const isRunning = !!runningIds[provider.id];
              const result = results[provider.id];
              const modelValue = modelOverrides[provider.id] ?? provider.defaultModel;

              return (
                <article
                  key={provider.id}
                  className={cn(
                    'glass-panel flex flex-col gap-3 rounded-2xl p-5 transition-colors',
                    result?.ok === true && 'border-emerald-500/35',
                    result?.ok === false && 'border-destructive/35',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {provider.label}
                        </h3>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {provider.envVar} · {provider.endpointType} ·{' '}
                        <span className={provider.configured ? 'text-brand' : 'text-amber-500'}>
                          {provider.configured ? 'configured' : 'missing in env'}
                        </span>
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isRunning || runningAll}
                      onClick={() => void runSingleTest(provider)}
                      variant={provider.configured ? 'default' : 'outline'}
                      className={cn(
                        'shrink-0 whitespace-nowrap rounded-xl text-xs',
                        provider.configured && 'bg-brand text-white hover:bg-brand/90',
                      )}
                    >
                      {isRunning ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                      {isRunning ? 'Testing…' : 'Test'}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-[11px] text-muted-foreground">Model:</span>
                    <input
                      type="text"
                      value={modelValue}
                      onChange={(e) =>
                        setModelOverrides((prev) => ({ ...prev, [provider.id]: e.target.value }))
                      }
                      aria-label={`Model override for ${provider.label}`}
                      className="h-8 w-full min-w-0 rounded-lg border border-hairline bg-surface-soft px-2.5 font-mono text-[11px] text-foreground outline-none focus-visible:border-brand/50"
                    />
                  </div>

                  {result && (
                    <div className="space-y-2 rounded-xl border border-hairline bg-surface-soft p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 font-medium',
                            result.ok ? 'text-emerald-500' : 'text-destructive',
                          )}
                        >
                          {result.ok ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : (
                            <XCircle className="size-3.5" />
                          )}
                          {result.ok ? 'Success' : 'Failed'}
                        </span>

                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          HTTP {result.httpStatus ?? '—'} · {result.latencyMs} ms
                        </span>
                      </div>

                      {result.output && (
                        <p className="rounded-lg border border-hairline bg-surface px-2.5 py-2 text-xs leading-relaxed text-foreground">
                          {result.output}
                        </p>
                      )}

                      {result.imageUrl && (
                        <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
                          <img
                            src={result.imageUrl}
                            alt={`Generated by ${provider.label}`}
                            className="max-h-60 w-full object-contain"
                          />
                        </div>
                      )}

                      {result.error && (
                        <p className="font-mono text-[11px] text-destructive break-all">
                          {result.error}
                        </p>
                      )}

                      {result.rawPreview && (
                        <details className="text-[11px] text-muted-foreground">
                          <summary className="cursor-pointer select-none hover:text-foreground">
                            Raw upstream response
                          </summary>
                          <pre className="mt-1.5 max-h-36 overflow-auto rounded-lg border border-hairline bg-surface p-2 font-mono text-[10px] whitespace-pre-wrap break-all">
                            {result.rawPreview}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
