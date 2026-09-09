'use client';

import { useEffect, useState } from 'react';

type Message = { role: string; content: string };

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [tools, setTools] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.messages)) setMessages(data.messages);
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion('');
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setPending(true);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    });
    setPending(false);
    const data = await res.json();
    if (res.ok) {
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      setTools(data.toolsUsed ?? []);
    } else {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.error ?? 'Coach request failed.' },
      ]);
    }
  }

  const suggestions = [
    'How am I progressing?',
    'Was today’s UT1 good?',
    'Can I hold 2:00 pace for a marathon?',
    'Compare my last three UT2 rows.',
    'What’s currently holding me back?',
    'What should I concentrate on this week?',
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <p className="label">AI coach</p>
        <h1 className="font-display text-3xl font-semibold">Ask your coach</h1>
        <p className="mt-1 text-sm text-ink-400">
          Questions are answered from retrieved training context — not the entire database.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-lg border border-ink-700 bg-ink-900/50 px-3 py-1.5 text-left text-xs text-ink-300 hover:border-ink-500 hover:text-ink-100"
            onClick={() => setQuestion(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <section className="panel flex min-h-[420px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-ink-500">Ask about progress, execution, or goal realism.</p>
          ) : null}
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'ml-auto bg-accent/20 text-ink-50'
                  : 'bg-ink-800/80 text-ink-200'
              }`}
            >
              {m.content}
            </div>
          ))}
          {pending ? <p className="text-sm text-ink-500">Retrieving evidence…</p> : null}
        </div>
        {tools.length ? (
          <div className="border-t border-ink-800 px-4 py-2 text-[11px] text-ink-500">
            Tools used: {tools.join(', ')}
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="flex gap-2 border-t border-ink-800 p-3">
          <input
            className="input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="How am I progressing toward 2:00 marathon pace?"
          />
          <button className="btn-primary shrink-0" disabled={pending} type="submit">
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
