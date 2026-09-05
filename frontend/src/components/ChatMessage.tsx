'use client';
import ReactMarkdown from 'react-markdown';

interface Source {
  index?: number;
  title: string;
  documentId?: string | null;
  url?: string | null;
}

export default function ChatMessage({ role, content, sources }: { role: string; content: string; sources?: string | Source[] | null }) {
  let parsed: Source[] = [];
  try {
    parsed = typeof sources === 'string' ? JSON.parse(sources || '[]') : (sources || []);
  } catch { parsed = []; }

  if (role === 'user') {
    return (
      <div className="flex justify-start mb-5 animate-fade-in">
        <div className="max-w-[85%] bg-gold/10 border border-gold/20 text-ink rounded-3xl rounded-tr-xl px-5 py-3.5 leading-8 whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6 animate-fade-in">
      <div className="max-w-[95%] w-full">
        <div className="bg-white border border-stroke rounded-3xl rounded-tl-xl px-6 py-5 shadow-card">
          <div className="markdown-content text-ink leading-8">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          {parsed.length > 0 && (
            <div className="mt-5 pt-4 border-t border-stroke">
              <p className="text-xs font-bold text-ink-secondary mb-2.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.686a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                منابع
              </p>
              <div className="space-y-1.5">
                {parsed.map((s, i) => (
                  <div key={i} className="text-xs text-ink-secondary flex items-center gap-2 bg-paper-dark rounded-xl px-3 py-2">
                    <span className="bg-gold/15 text-gold rounded-lg px-2 py-0.5 font-bold text-[10px] shrink-0">
                      [{s.index ?? i + 1}]
                    </span>
                    <span className="truncate">{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
