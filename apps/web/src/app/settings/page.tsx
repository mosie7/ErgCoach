'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

type C2Status = {
  connected: boolean;
  lastSyncAt: string | null;
  workoutCount: number;
  configured: boolean;
  useMock: boolean;
  mode: string;
  redirectUri?: string;
  clientIdPrefix?: string | null;
};

const FALLBACK_REDIRECT =
  'https://main.d174rb114dlpeo.amplifyapp.com/api/concept2/callback';

function SettingsInner() {
  const params = useSearchParams();
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const [personalToken, setPersonalToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [c2, setC2] = useState<C2Status | null>(null);
  const [csv, setCsv] = useState(
    `date,distance,time,pace,hr,spm,type,title
2026-09-01T07:00:00.000Z,12000,3096,129,138,18,UT2,CSV UT2 12k`,
  );

  const redirectUri =
    c2?.redirectUri ||
    (typeof window !== 'undefined' ? `${window.location.origin}/api/concept2/callback` : FALLBACK_REDIRECT);

  function refreshStatus() {
    fetch('/api/concept2/status')
      .then((r) => r.json())
      .then((data) => setC2(data))
      .catch(() => undefined);
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function copyRedirect() {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function importCsv() {
    setCsvStatus('Importing…');
    const res = await fetch('/api/import/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    });
    const data = await res.json().catch(() => ({}));
    setCsvStatus(res.ok ? `Imported ${data.count} workouts` : data.error ?? 'Import failed');
  }

  async function syncConcept2(full = false) {
    setSyncStatus(full ? 'Full syncing…' : 'Syncing…');
    let totalImported = 0;
    let totalSkipped = 0;
    let lastMode = 'live';
    let lastErrors = 0;

    try {
      for (let i = 0; i < 50; i++) {
        const res = await fetch('/api/concept2/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full: full && i === 0, limit: 10 }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSyncStatus(
            totalImported > 0
              ? `Stopped after ${totalImported} imported — ${data.error ?? 'Sync failed'}`
              : (data.error ?? 'Sync failed'),
          );
          refreshStatus();
          return;
        }
        totalImported += Number(data.importedCount ?? 0);
        totalSkipped += Number(data.skippedDuplicates ?? 0);
        lastMode = data.mode ?? lastMode;
        if (Array.isArray(data.importErrors) && data.importErrors.length) {
          lastErrors += data.importErrors.length;
        }
        setSyncStatus(
          data.hasMore
            ? `Imported ${totalImported} so far…`
            : `Imported ${totalImported}, skipped ${totalSkipped} duplicates (${lastMode})`,
        );
        if (!data.hasMore) break;
      }
      const errHint = lastErrors ? ` · ${lastErrors} item warning(s)` : '';
      setSyncStatus(
        `Imported ${totalImported}, skipped ${totalSkipped} duplicates (${lastMode})${errHint}`,
      );
      refreshStatus();
    } catch {
      setSyncStatus(
        totalImported > 0
          ? `Stopped after ${totalImported} imported — network error`
          : 'Sync failed',
      );
    }
  }

  async function savePersonalToken() {
    setTokenStatus('Saving token…');
    const res = await fetch('/api/concept2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: personalToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setTokenStatus(data.error ?? 'Could not save token');
      return;
    }
    setPersonalToken('');
    setTokenStatus('Connected with personal access token. Click Sync workouts.');
    refreshStatus();
  }

  async function disconnect() {
    await fetch('/api/concept2/disconnect', { method: 'POST' });
    refreshStatus();
    setSyncStatus('Disconnected');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="page-title text-[32px]">Settings</h1>
        <p className="mt-2 text-[15px] text-apple-gray-500">
          Connect your Concept2 Logbook and manage imports.
        </p>
      </div>

      {params.get('concept2') === 'connected' || params.get('onboarding') === 'done' ? (
        <div className="rounded-apple border border-green-200 bg-green-50 px-4 py-3 text-[14px] text-green-800">
          {params.get('concept2') === 'connected'
            ? 'Concept2 connected. Sync your workouts below.'
            : 'Profile saved. Connect Concept2 to import your Logbook.'}
        </div>
      ) : null}

      {params.get('concept2') === 'error' ? (
        <div className="rounded-apple border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          <p className="font-medium">Concept2 connection failed</p>
          {params.get('reason')?.includes('invalid value') ||
          params.get('reason')?.includes('metadata') ||
          params.get('reason')?.includes('Unauthorized') ? (
            <p className="mt-1">
              Server save error: {params.get('reason')}. This is an app bug/fix — try again after
              the latest deploy, or use a personal access token below.
            </p>
          ) : (
            <>
              <p className="mt-1">
                That “Application Authorization” page usually means the redirect URI is not
                registered on your Concept2 developer app
                {params.get('reason') ? ` (also: ${params.get('reason')})` : ''}.
              </p>
              <p className="mt-2">
                If OAuth still fails after registering the URI, use a personal access token below.
              </p>
            </>
          )}
        </div>
      ) : null}

      <section className="panel space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="section-title">Concept2 Logbook</h2>
            <p className="mt-1 text-[14px] text-apple-gray-500">
              OAuth connects <strong>your</strong> Logbook to <strong>your</strong> account only.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              c2?.connected
                ? 'bg-green-50 text-green-700'
                : 'bg-apple-gray-100 text-apple-gray-500'
            }`}
          >
            {c2?.connected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        <div className="grid gap-2 text-[13px] text-apple-gray-500 sm:grid-cols-3">
          <div>
            Mode · <span className="text-apple-gray-700 dark:text-apple-gray-200">{c2?.mode ?? '…'}</span>
          </div>
          <div>
            Workouts imported ·{' '}
            <span className="text-apple-gray-700 dark:text-apple-gray-200">
              {c2?.workoutCount ?? 0}
            </span>
          </div>
          <div>
            Last sync ·{' '}
            <span className="text-apple-gray-700 dark:text-apple-gray-200">
              {c2?.lastSyncAt ? new Date(c2.lastSyncAt).toLocaleString() : 'Never'}
            </span>
          </div>
        </div>

        <div className="rounded-apple border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950">
          <p className="font-medium">Before OAuth Connect works</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Open{' '}
              <a
                className="underline"
                href="https://log.concept2.com/developers/keys"
                target="_blank"
                rel="noreferrer"
              >
                Concept2 API keys
              </a>{' '}
              and edit the app matching client id prefix{' '}
              <code>{c2?.clientIdPrefix ?? '…'}</code>
            </li>
            <li>Add this redirect URI exactly (no trailing slash):</li>
          </ol>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-white/80 px-2 py-1 text-[12px]">{redirectUri}</code>
            <button type="button" className="btn-ghost text-[12px]" onClick={copyRedirect}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2">Save in Concept2, then try Connect again.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a className="btn-primary" href="/api/concept2/connect">
            {c2?.connected ? 'Reconnect via OAuth' : 'Connect via OAuth'}
          </a>
          <button
            className="btn-accent"
            type="button"
            onClick={() => syncConcept2(false)}
            disabled={!c2?.connected && !c2?.useMock}
          >
            Sync workouts
          </button>
          <button
            className="btn-ghost"
            type="button"
            onClick={() => syncConcept2(true)}
            disabled={!c2?.connected && !c2?.useMock}
          >
            Full resync
          </button>
          {c2?.connected ? (
            <button className="btn-ghost" type="button" onClick={disconnect}>
              Disconnect
            </button>
          ) : null}
          <Link href="/onboarding" className="btn-ghost">
            Edit profile / goal
          </Link>
        </div>
        {syncStatus ? <p className="text-[13px] text-apple-gray-500">{syncStatus}</p> : null}

        <div className="border-t border-apple-gray-100 pt-4 dark:border-apple-gray-800">
          <h3 className="text-[14px] font-medium">Recommended: personal access token</h3>
          <p className="mt-1 text-[13px] text-apple-gray-500">
            Concept2 documents this for personal apps. In Logbook go to{' '}
            <strong>Edit Profile → Applications → Concept2 Logbook API integration</strong>, create a
            token, paste it here. No developer redirect URI required.
          </p>
          <input
            className="input mt-3 font-mono text-[12px]"
            type="password"
            autoComplete="off"
            placeholder="Paste Concept2 access token"
            value={personalToken}
            onChange={(e) => setPersonalToken(e.target.value)}
          />
          <button
            className="btn-primary mt-3"
            type="button"
            disabled={personalToken.trim().length < 20}
            onClick={savePersonalToken}
          >
            Save token & connect
          </button>
          {tokenStatus ? <p className="mt-2 text-[13px] text-apple-gray-500">{tokenStatus}</p> : null}
        </div>
      </section>

      <section className="panel space-y-3 p-6">
        <h2 className="section-title">Subscription</h2>
        <p className="text-[14px] text-apple-gray-500">
          Pro unlocks AI coach chat and AI reports. Free keeps logging and objective metrics.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-primary" href="/pricing">
            View plans
          </Link>
          <Link className="btn-ghost" href="/billing">
            Manage billing
          </Link>
        </div>
      </section>

      <section className="panel space-y-3 p-6">
        <h2 className="section-title">CSV import</h2>
        <p className="text-[14px] text-apple-gray-500">
          Columns: date, distance, time, pace, hr, spm, type, title.
        </p>
        <textarea
          className="input min-h-[120px] font-mono text-[12px]"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <button className="btn-primary" type="button" onClick={importCsv}>
          Import CSV
        </button>
        {csvStatus ? <p className="text-[13px] text-apple-gray-500">{csvStatus}</p> : null}
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-apple-gray-500">Loading…</p>}>
      <SettingsInner />
    </Suspense>
  );
}
