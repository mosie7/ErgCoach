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
};

function SettingsInner() {
  const params = useSearchParams();
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [c2, setC2] = useState<C2Status | null>(null);
  const [csv, setCsv] = useState(
    `date,distance,time,pace,hr,spm,type,title
2026-09-01T07:00:00.000Z,12000,3096,129,138,18,UT2,CSV UT2 12k`,
  );

  function refreshStatus() {
    fetch('/api/concept2/status')
      .then((r) => r.json())
      .then((data) => setC2(data))
      .catch(() => undefined);
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function importCsv() {
    setCsvStatus('Importing…');
    const res = await fetch('/api/import/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    });
    const data = await res.json();
    setCsvStatus(res.ok ? `Imported ${data.count} workouts` : data.error ?? 'Import failed');
  }

  async function syncConcept2(full = false) {
    setSyncStatus(full ? 'Full syncing…' : 'Syncing…');
    const res = await fetch('/api/concept2/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSyncStatus(data.error ?? 'Sync failed');
      return;
    }
    const errHint =
      Array.isArray(data.importErrors) && data.importErrors.length
        ? ` · ${data.importErrors.length} item warning(s)`
        : '';
    setSyncStatus(
      `Imported ${data.importedCount} of ${data.fetchedCount ?? data.importedCount} fetched, skipped ${data.skippedDuplicates} duplicates (${data.mode})${errHint}`,
    );
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
          <p>
            Concept2 connection failed
            {params.get('reason') ? `: ${params.get('reason')}` : ''}.
          </p>
          <p className="mt-2">
            In the{' '}
            <a
              className="underline"
              href="https://log.concept2.com/developers"
              target="_blank"
              rel="noreferrer"
            >
              Concept2 developer console
            </a>
            , your app redirect URI must be exactly:
          </p>
          <code className="mt-2 block break-all rounded bg-white/70 px-2 py-1 text-[12px] text-red-900">
            {typeof window !== 'undefined'
              ? `${window.location.origin}/api/concept2/callback`
              : 'https://main.d174rb114dlpeo.amplifyapp.com/api/concept2/callback'}
          </code>
        </div>
      ) : null}

      <section className="panel space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="section-title">Concept2 Logbook</h2>
            <p className="mt-1 text-[14px] text-apple-gray-500">
              OAuth connects <strong>your</strong> Logbook to <strong>your</strong> account only.
            </p>
            <p className="mt-2 text-[12px] text-apple-gray-400">
              Required redirect URI:{' '}
              <code className="break-all">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/api/concept2/callback`
                  : '/api/concept2/callback'}
              </code>
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

        {!c2?.configured && !c2?.useMock ? (
          <p className="text-[13px] text-amber-700">
            Server missing CONCEPT2_CLIENT_ID / CONCEPT2_CLIENT_SECRET. Add them to enable live
            OAuth.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <a className="btn-primary" href="/api/concept2/connect">
            {c2?.connected ? 'Reconnect Concept2' : 'Connect Concept2'}
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
