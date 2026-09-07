'use client';

import { useId, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { DotsSixVertical } from '@phosphor-icons/react';
import { useI18n } from './i18n';
import { financeError } from './finance-errors';

type Row = { id: string; label: string; content: ReactNode; movable: boolean };
type Drag = { id: string; pointerId: number; x: number; y: number; moved: boolean; slots: DOMRect[]; ids: string[]; scrollTop: number; scroller: HTMLElement | null };

/** Pointer capture works with touch and mouse; the handle leaves row scrolling and opening intact. */
export function SortableAccountRows({ rows, onReorder }: { rows: Row[]; onReorder?: (ids: string[]) => Promise<unknown> }) {
  const { locale } = useI18n(); const vi = locale === 'vi'; const hintId = useId();
  const listRef = useRef<HTMLDivElement>(null); const drag = useRef<Drag | null>(null);
  const orderRef = useRef<string[] | null>(null); const savingRef = useRef(false);
  const [order, setOrder] = useState<string[] | null>(null); const [dragging, setDragging] = useState<string>();
  const [saving, setSaving] = useState(false); const [status, setStatus] = useState(''); const [error, setError] = useState('');
  const movable = rows.filter((row) => row.movable);
  const enabled = Boolean(onReorder) && movable.length > 1;
  const displayed = order ? order.map((id) => rows.find((row) => row.id === id)).filter((row): row is Row => Boolean(row)) : rows;

  function preview(ids: string[]) { orderRef.current = ids; setOrder(ids); }
  function cancel() {
    const current = drag.current; drag.current = null; setDragging(undefined); orderRef.current = null; setOrder(null);
    if (current && listRef.current?.hasPointerCapture(current.pointerId)) listRef.current.releasePointerCapture(current.pointerId);
  }
  async function save(ids: string[], focusId?: string) {
    if (!onReorder || savingRef.current || ids.every((id, index) => id === rows[index]?.id)) { cancel(); return; }
    savingRef.current = true; setSaving(true); setError('');
    try {
      const result = await onReorder(ids.filter((id) => movable.some((row) => row.id === id)));
      if (result !== false) setStatus(vi ? 'Đã lưu thứ tự nguồn tiền.' : 'Account order saved.');
    } catch (cause) { setError(financeError(cause, locale)); }
    finally {
      savingRef.current = false; setSaving(false); cancel();
      if (focusId) requestAnimationFrame(() => Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[data-drag-handle]') ?? []).find((handle) => handle.dataset.dragHandle === focusId)?.focus());
    }
  }
  function start(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0 || savingRef.current || drag.current || !listRef.current) return;
    const elements = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-sortable-row]') ?? []);
    const scroller = listRef.current?.closest<HTMLElement>('.form-sheet') ?? document.scrollingElement as HTMLElement | null;
    drag.current = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, slots: elements.map((el) => el.getBoundingClientRect()), ids: rows.map((row) => row.id), scrollTop: scroller?.scrollTop ?? 0, scroller };
    // The list stays in the DOM while previewing a new order moves its rows.
    listRef.current.setPointerCapture(event.pointerId); setStatus(''); setError('');
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current; if (!current || current.pointerId !== event.pointerId) return;
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return;
    current.moved = true; setDragging(current.id);
    const viewport = current.scroller === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : current.scroller?.getBoundingClientRect();
    if (viewport && current.scroller) {
      if (event.clientY < viewport.top + 52) current.scroller.scrollTop -= 14;
      else if (event.clientY > viewport.bottom - 52) current.scroller.scrollTop += 14;
    }
    const scrollOffset = (current.scroller?.scrollTop ?? 0) - current.scrollTop;
    const origin = current.slots[current.ids.indexOf(current.id)];
    const centerX = origin.left + origin.width / 2 + event.clientX - current.x;
    const centerY = origin.top + origin.height / 2 + event.clientY - current.y + scrollOffset;
    let target = -1; let distance = Infinity;
    current.slots.forEach((rect, index) => {
      if (!rows.find((row) => row.id === current.ids[index])?.movable) return;
      const d = Math.hypot(centerX - (rect.left + rect.width / 2), centerY - (rect.top + rect.height / 2));
      if (d < distance) { distance = d; target = index; }
    });
    if (target < 0) return;
    const activeIds = current.ids.filter((id) => movable.some((row) => row.id === id));
    const from = activeIds.indexOf(current.id); const to = activeIds.indexOf(current.ids[target]);
    activeIds.splice(from, 1); activeIds.splice(to, 0, current.id);
    let next = 0; preview(current.ids.map((id) => movable.some((row) => row.id === id) ? activeIds[next++] : id));
  }
  return <>
    {enabled && <p id={hintId} className="account-reorder-hint">{vi ? 'Kéo nút chấm để sắp xếp. Dùng phím ↑ ↓ khi chọn nút.' : 'Drag the grip to reorder, or focus it and use ↑ ↓.'}</p>}
    <div ref={listRef} className="account-source-grid" aria-busy={saving} onPointerMove={move}
      onPointerUp={(event) => {
        const current = drag.current; if (!current || current.pointerId !== event.pointerId) return;
        drag.current = null; setDragging(undefined);
        if (current.moved && orderRef.current) void save(orderRef.current, current.id); else cancel();
      }}
      onPointerCancel={(event) => { if (drag.current?.pointerId === event.pointerId) cancel(); }}
      onLostPointerCapture={(event) => { if (drag.current?.pointerId === event.pointerId) cancel(); }}>
      {displayed.map((row) => <div data-sortable-row={row.id} className={`account-sortable-row${dragging === row.id ? ' is-dragging' : ''}`} key={row.id}>
        {row.content}
        {enabled && row.movable && <button type="button" className="account-drag-handle" data-drag-handle={row.id} aria-label={`${vi ? 'Sắp xếp' : 'Reorder'} ${row.label}`} aria-describedby={hintId} disabled={saving}
          onPointerDown={(event) => start(event, row.id)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && drag.current) { event.preventDefault(); event.stopPropagation(); cancel(); return; }
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || savingRef.current) return;
            event.preventDefault(); const ids = movable.map((item) => item.id); const from = ids.indexOf(row.id);
            const to = event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : from + (event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1);
            if (to < 0 || to >= ids.length || to === from) return;
            ids.splice(from, 1); ids.splice(to, 0, row.id); let next = 0;
            const all = rows.map((item) => item.movable ? ids[next++] : item.id); preview(all); void save(all, row.id);
          }}><DotsSixVertical size={20} weight="bold" aria-hidden="true" /></button>}
      </div>)}
    </div>
    <span className="sr-only" role="status">{status}</span>
    {error && <p className="field-error" role="alert">{error}</p>}
  </>;
}
