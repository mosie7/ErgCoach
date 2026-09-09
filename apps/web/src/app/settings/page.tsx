'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [csv, setCsv] = useState(
    `date,distance,time,pace,hr,spm,type,title
2026-09-01T07:00:00.000Z,12000,3096,129,138,18,UT2,CSV UT2 12k`,
  );

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

  async function syncConcept2() {
    setSyncStatus('Syncing…');
    const res = await fetch('/api/concept2/sync', { method: 'POST' });
    const data = await res.json();
    setSyncStatus(
      res.ok
        ? `Imported ${data.importedCount}, skipped ${data.skippedDuplicates} duplicates`
        : data.error ?? 'Sync failed',
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="label">Settings</p>
        <h1 className="font-display text-3xl font-semibold">Integrations & import</h1>
      </div>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Concept2 Logbook</h2>
        <p className="text-sm text-ink-400">
          OAuth + sync are implemented behind a Concept2Client adapter. Mock mode is on by default
          (`CONCEPT2_USE_MOCK=true`). Live endpoints are marked VERIFY against Concept2 docs.
        </p>
        <div className="flex flex-wrap gap-2">
          <a className="btn-ghost" href="/api/concept2/connect">
            Connect Concept2 (OAuth)
          </a>
          <button className="btn-primary" type="button" onClick={syncConcept2}>
            Sync workouts
          </button>
        </div>
        {syncStatus ? <p className="text-sm text-ink-300">{syncStatus}</p> : null}
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">CSV import</h2>
        <p className="text-sm text-ink-400">
          Generic Concept2-style columns: date, distance, time, pace, hr, spm, type, title.
        </p>
        <textarea className="input min-h-[140px] font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} />
        <button className="btn-primary" type="button" onClick={importCsv}>
          Import CSV
        </button>
        {csvStatus ? <p className="text-sm text-ink-300">{csvStatus}</p> : null}
      </section>

      <section className="panel space-y-2 p-5 text-sm text-ink-400">
        <h2 className="font-display text-lg font-semibold text-ink-100">Safety</h2>
        <p>
          ErgCoach is training analytics software, not medical software. It does not diagnose
          conditions. Unusual health-related notes should prompt professional evaluation.
        </p>
      </section>
    </div>
  );
}
