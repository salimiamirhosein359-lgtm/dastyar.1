'use client';
import { useState, useRef, useEffect } from 'react';

interface AttachedDoc {
  id: string;
  title: string;
}

export default function ChatInput({
  onSend,
  loading,
  disabled,
  onSearchToggle,
  searchActive,
}: {
  onSend: (text: string, docIds: string[]) => void;
  loading: boolean;
  disabled?: boolean;
  onSearchToggle?: () => void;
  searchActive?: boolean;
}) {
  const [text, setText] = useState('');
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const docPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [text]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (docPickerRef.current && !docPickerRef.current.contains(e.target as Node)) {
        setShowDocPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDocs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAvailableDocs((data.documents || []).filter((d: any) => d.status === 'ready'));
    } catch {}
  };

  const toggleDocPicker = () => {
    if (!showDocPicker) loadDocs();
    setShowDocPicker(!showDocPicker);
  };

  const attachDoc = (doc: any) => {
    if (attachedDocs.length >= 4) return;
    if (attachedDocs.find(d => d.id === doc.id)) return;
    setAttachedDocs(prev => [...prev, { id: doc.id, title: doc.title }]);
    setShowDocPicker(false);
  };

  const removeDoc = (id: string) => {
    setAttachedDocs(prev => prev.filter(d => d.id !== id));
  };

  const submit = () => {
    const t = text.trim();
    if (!t || loading || disabled) return;
    onSend(t, attachedDocs.map(d => d.id));
    setText('');
    setAttachedDocs([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <div className="relative">
      {/* Document Picker Dropdown */}
      {showDocPicker && (
        <div ref={docPickerRef} className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-stroke rounded-2xl shadow-lg p-3 z-50 animate-fade-in">
          <p className="text-xs font-bold text-ink mb-2">انتخاب سند (حداکثر 4 فایل)</p>
          {availableDocs.length === 0 ? (
            <p className="text-xs text-ink-muted py-3 text-center">هنوز سندی آپلود نشده</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {availableDocs.map((doc) => {
                const attached = attachedDocs.find(d => d.id === doc.id);
                const full = attachedDocs.length >= 4 && !attached;
                return (
                  <button
                    key={doc.id}
                    onClick={() => attachDoc(doc)}
                    disabled={!!attached || full}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all text-right ${
                      attached
                        ? 'bg-gold/10 text-gold border border-gold/30'
                        : full
                        ? 'bg-gray-50 text-ink-muted cursor-not-allowed opacity-50'
                        : 'bg-paper hover:bg-gold/5 text-ink border border-transparent hover:border-gold/20'
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="truncate">{doc.title}</span>
                    {attached && <span className="text-gold">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Attached Files Chips */}
      {attachedDocs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 px-1">
          {attachedDocs.map((doc) => (
            <span key={doc.id} className="inline-flex items-center gap-1 bg-gold/10 text-gold text-xs px-2.5 py-1 rounded-full border border-gold/20">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="truncate max-w-[100px]">{doc.title}</span>
              <button onClick={() => removeDoc(doc.id)} className="hover:text-red-500 ml-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border border-stroke rounded-3xl shadow-card focus-within:ring-2 focus-within:ring-gold/20 focus-within:border-gold/50 transition-all duration-300">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={disabled ? 'ابتدا وارد شوید...' : 'سوالت رو بپرس...'}
          disabled={disabled || loading}
          rows={1}
          className="w-full bg-transparent px-5 pt-4 pb-1 resize-none focus:outline-none text-ink placeholder-ink-muted text-sm leading-7 disabled:opacity-40"
        />
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <div className="flex items-center gap-1">
            {/* Folder/Document Icon */}
            <button
              onClick={toggleDocPicker}
              className={`p-2 rounded-xl transition-all ${
                showDocPicker
                  ? 'bg-gold/10 text-gold'
                  : 'text-ink-muted hover:text-ink hover:bg-ink/5'
              }`}
              title="انتخاب سند"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </button>

            {/* Web Search Toggle */}
            <button
              onClick={onSearchToggle}
              className={`p-2 rounded-xl transition-all ${
                searchActive
                  ? 'bg-blue-50 text-blue-500'
                  : 'text-ink-muted hover:text-ink hover:bg-ink/5'
              }`}
              title={searchActive ? 'جستجوی وب فعال' : 'فعال کردن جستجوی وب'}
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </button>

            <span className="text-[10px] text-ink-muted mr-2 hidden sm:inline">Enter ارسال</span>
          </div>

          <button
            onClick={submit}
            disabled={!text.trim() || loading || disabled}
            className="px-5 py-2.5 rounded-2xl bg-gold hover:bg-gold-hover text-white font-bold text-xs transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                در حال پاسخ
              </>
            ) : (
              <>
                ارسال
                <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
