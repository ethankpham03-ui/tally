'use client';

import { X } from '@phosphor-icons/react';
import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from './i18n';

export function focusFirstInvalid(form: HTMLFormElement | null) {
  window.requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
}

export function SheetFrame({ title, subtitle, labelledBy, onClose, children, className = '', busy = false }: {
  title: string; subtitle: string; labelledBy: string; onClose: () => void;
  children: ReactNode; className?: string; busy?: boolean;
}) {
  const { c } = useI18n();
  const reduced = useReducedMotion();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => { closeRef.current = onClose; busyRef.current = busy; }, [onClose, busy]);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('is-sheet-open');
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) { event.preventDefault(); dialog?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
    });
    window.addEventListener('keydown', handleKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.classList.remove('is-sheet-open');
      window.removeEventListener('keydown', handleKey);
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <m.div className="sheet-backdrop" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose(); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0.08 : 0.16 }}>
      <m.section ref={dialogRef} className={`form-sheet ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-busy={busy} tabIndex={-1} initial={{ opacity: 0, y: reduced ? 0 : 18, scale: reduced ? 1 : 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : 12 }} transition={{ duration: reduced ? 0.08 : 0.26, ease: [0.16, 1, 0.3, 1] }}>
        <header className="sheet-header"><div><h2 id={labelledBy}>{title}</h2><p>{subtitle}</p></div><button type="button" onClick={onClose} disabled={busy} aria-label={c.common.close}><X size={21} weight="bold" aria-hidden="true" /></button></header>
        {children}
      </m.section>
    </m.div>
  );
}
