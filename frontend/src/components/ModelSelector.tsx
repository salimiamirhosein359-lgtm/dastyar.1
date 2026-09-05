'use client';

interface Model {
  id: string;
  name?: string;
  label?: string;
  provider?: string;
}

export default function ModelSelector({
  models,
  value,
  onChange,
}: {
  models: Model[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (models.length === 0) return null;
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-stroke rounded-2xl pl-8 pr-4 py-2.5 text-sm text-ink font-medium focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold cursor-pointer"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label || m.name || m.id}
          </option>
        ))}
      </select>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
  );
}
