'use client';
import { useState, useRef, useEffect } from 'react';

interface AttachedFile {
  id: string;
  title: string;
  uploading?: boolean;
}

const MAX_FILES = 5;
const ALLOWED_EXT = ['.txt', '.md', '.csv', '.json', '.js', '.ts', '.py', '.html', '.css', '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma', '.mp4', '.avi', '.mov'];

export default function ChatInput({
  onSend,
  loading,
  disabled,
  onSearchToggle,
  searchActive,
  deepResearch,
  onDeepResearchToggle,
}: {
  onSend: (text: string, docIds: string[]) => void;
  loading: boolean;
  disabled?: boolean;
  onSearchToggle?: () => void;
  searchActive?: boolean;
  deepResearch?: boolean;
  onDeepResearchToggle?: () => void;
}) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const docPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const attachExistingDoc = (doc: any) => {
    if (files.length >= MAX_FILES) return;
    if (files.find(f => f.id === doc.id)) return;
    setFiles(prev => [...prev, { id: doc.id, title: doc.title }]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFile = async (file: File) => {
    if (files.length >= MAX_FILES) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      alert('فرمت فایل پشتیبانی نمیشه');
      return;
    }

    const tempId = 'uploading-' + Date.now() + Math.random();
    setFiles(prev => [...prev, { id: tempId, title: file.name, uploading: true }]);

    try {
      const token = localStorage.getItem('token');
      const buffer = await file.arrayBuffer();
      const res = await fetch('/api/documents/upload-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'X-Filename': encodeURIComponent(file.name),
        },
        body: Buffer.from(buffer),
      });
      const data = await res.json();
      if (data.document?.id) {
        setFiles(prev => prev.map(f => f.id === tempId ? { id: data.document.id, title: data.document.title || file.name, uploading: false } : f));
      } else {
        setFiles(prev => prev.filter(f => f.id !== tempId));
        alert(data.error || 'خطا در آپلود فایل');
      }
    } catch {
      setFiles(prev => prev.filter(f => f.id !== tempId));
      alert('خطا در آپلود فایل');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    for (let i = 0; i < selected.length && files.length < MAX_FILES; i++) {
      uploadFile(selected[i]);
    }
    e.target.value = '';
  };

  const attachDocs = (docIds: string[]) => {
    onSend(text.trim(), docIds);
    setText('');
    setFiles([]);
    setShowDocPicker(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const submit = () => {
    const t = text.trim();
    if (!t || loading || disabled) return;
    const docIds = files.map(f => f.id).filter(id => !id.startsWith('uploading-'));
    if (files.some(f => f.uploading)) {
      alert('صبر کن فایل‌ها آپلود بشن');
      return;
    }
    attachDocs(docIds);
  };

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="*/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Doc picker */}
      {showDocPicker && (
        <div ref={docPickerRef} className="absolute bottom-full mb-3 left-0 right-0 bg-white border border-stroke rounded-2xl shadow-2xl p-3 z-50 animate-fade-in">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-extrabold text-ink">انتخاب سند</p>
            <span className="text-[10px] text-ink-muted bg-paper rounded-lg px-2 py-0.5">{files.length}/{MAX_FILES}</span>
          </div>
          {availableDocs.length === 0 ? (
            <p className="text-xs text-ink-muted py-4 text-center bg-paper rounded-xl border border-stroke">هنوز سندی آپلود نشده</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {availableDocs.map((doc) => {
                const attached = files.find(f => f.id === doc.id);
                const full = files.length >= MAX_FILES && !attached;
                return (
                  <button
                    key={doc.id}
                    onClick={() => attachExistingDoc(doc)}
                    disabled={!!attached || full}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all text-right ${
                      attached
                        ? 'bg-gold/10 text-gold border border-gold/20'
                        : full
                        ? 'bg-gray-50 text-ink-muted cursor-not-allowed opacity-40'
                        : 'bg-paper hover:bg-gold/5 text-ink border border-transparent hover:border-gold/15'
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="truncate">{doc.title}</span>
                    {attached && <span className="mr-auto text-[10px]">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-stroke">
            <button
              onClick={() => { fileInputRef.current?.click(); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold/8 hover:bg-gold/15 text-gold text-xs font-bold transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              آپلود فایل جدید
            </button>
          </div>
        </div>
      )}

      {/* Attached files chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 px-1">
          {files.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1.5 bg-gold/8 text-gold text-xs px-3 py-1 rounded-full border border-gold/15">
              {f.uploading ? (
                <span className="w-3 h-3 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              )}
              <span className="truncate max-w-[120px]">{f.title}</span>
              {!f.uploading && (
                <button onClick={() => removeFile(f.id)} className="hover:text-red-400 -mr-1 p-0.5">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Main input area */}
      <div className="bg-white border border-stroke rounded-[24px] shadow-[0_2px_16px_rgba(0,0,0,0.06)] focus-within:shadow-[0_4px_24px_rgba(184,147,74,0.12)] focus-within:border-gold/30 transition-all duration-300">
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
          placeholder={disabled ? 'ابتدا وارد شوید...' : 'پیامتو بنویس...'}
          disabled={disabled || loading}
          rows={1}
          className="w-full bg-transparent px-5 pt-4 pb-2 resize-none focus:outline-none text-ink placeholder-ink-muted/50 text-[15px] leading-7 disabled:opacity-40"
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-1">
            {/* Upload new file */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl text-ink-muted hover:text-gold hover:bg-gold/5 transition-all duration-200"
              title="آپلود فایل"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </button>

            {/* Pick existing doc */}
            <button
              onClick={toggleDocPicker}
              className={`p-2.5 rounded-xl transition-all duration-200 ${showDocPicker ? 'bg-gold/10 text-gold' : 'text-ink-muted hover:text-ink-secondary hover:bg-stroke-light'}`}
              title="انتخاب سند"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </button>

            {/* Web search toggle */}
            <button
              onClick={onSearchToggle}
              className={`p-2.5 rounded-xl transition-all duration-200 ${searchActive ? 'bg-blue-50 text-blue-500' : 'text-ink-muted hover:text-ink-secondary hover:bg-stroke-light'}`}
              title={searchActive ? 'جستجوی وب فعال' : 'فعال کردن جستجوی وب'}
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </button>

            {/* Deep research toggle */}
            <button
              onClick={onDeepResearchToggle}
              className={`p-2.5 rounded-xl transition-all duration-200 ${deepResearch ? 'bg-purple-50 text-purple-500' : 'text-ink-muted hover:text-ink-secondary hover:bg-stroke-light'}`}
              title={deepResearch ? 'تحقیق عمیق فعال' : 'فعال کردن تحقیق عمیق'}
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-muted/40 hidden sm:inline">Enter ↵</span>
            <button
              onClick={submit}
              disabled={!text.trim() || loading || disabled}
              className="w-10 h-10 rounded-2xl bg-gold hover:bg-gold-hover text-white font-bold transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md hover:shadow-gold/20 active:scale-95"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
