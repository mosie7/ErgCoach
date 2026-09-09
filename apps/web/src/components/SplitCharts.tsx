'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function SplitCharts({
  splits,
}: {
  splits: Array<{
    index: number;
    paceSeconds500m?: number | null;
    heartRate?: number | null;
    strokeRate?: number | null;
  }>;
}) {
  const data = splits.map((s) => ({
    split: s.index + 1,
    pace: s.paceSeconds500m ?? undefined,
    hr: s.heartRate ?? undefined,
    spm: s.strokeRate ?? undefined,
  }));

  if (data.length === 0) {
    return <p className="text-sm text-ink-400">No split data for charts.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(151,180,194,0.12)" strokeDasharray="3 3" />
          <XAxis dataKey="split" stroke="#628ea1" tick={{ fill: '#8aa0ad', fontSize: 11 }} />
          <YAxis yAxisId="pace" stroke="#e85d04" tick={{ fill: '#8aa0ad', fontSize: 11 }} domain={['auto', 'auto']} />
          <YAxis yAxisId="hr" orientation="right" stroke="#2a9d8f" tick={{ fill: '#8aa0ad', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: '#162028',
              border: '1px solid rgba(151,180,194,0.2)',
              borderRadius: 8,
            }}
          />
          <Legend />
          <Line yAxisId="pace" type="monotone" dataKey="pace" name="Pace s/500m" stroke="#e85d04" dot={false} strokeWidth={2} />
          <Line yAxisId="hr" type="monotone" dataKey="hr" name="HR" stroke="#2a9d8f" dot={false} strokeWidth={2} />
          <Line yAxisId="hr" type="monotone" dataKey="spm" name="SPM" stroke="#e9c46a" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
