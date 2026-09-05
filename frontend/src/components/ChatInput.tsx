'use client';
import { useState, useRef, useEffect } from 'react';

export default function ChatInput({
  onSend,
  loading,
  disabled,
}: {
  onSend: (text: string) => void;
  loading: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [text]);

  const submit = () => {
    const t = text.trim();
    if (!t || loading || disabled) return;
    onSend(t);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
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
        <span className="text-[10px] text-ink-muted">Enter برای ارسال · Shift+Enter برای خط جدید</span>
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
  );
}
