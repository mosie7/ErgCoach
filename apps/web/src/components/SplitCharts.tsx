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
    return <p className="text-[14px] text-apple-gray-500">No split data for charts.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />
          <XAxis dataKey="split" stroke="#86868b" tick={{ fill: '#86868b', fontSize: 11 }} />
          <YAxis
            yAxisId="pace"
            stroke="#1d1d1f"
            tick={{ fill: '#86868b', fontSize: 11 }}
            domain={['auto', 'auto']}
          />
          <YAxis
            yAxisId="hr"
            orientation="right"
            stroke="#0071e3"
            tick={{ fill: '#86868b', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid #d2d2d7',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            }}
          />
          <Legend />
          <Line
            yAxisId="pace"
            type="monotone"
            dataKey="pace"
            name="Pace s/500m"
            stroke="#1d1d1f"
            dot={false}
            strokeWidth={2}
          />
          <Line
            yAxisId="hr"
            type="monotone"
            dataKey="hr"
            name="HR"
            stroke="#0071e3"
            dot={false}
            strokeWidth={2}
          />
          <Line
            yAxisId="hr"
            type="monotone"
            dataKey="spm"
            name="SPM"
            stroke="#86868b"
            dot={false}
            strokeWidth={1.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
