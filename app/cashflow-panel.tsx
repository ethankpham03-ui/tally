'use client';

import { ArrowDown, ArrowUp } from '@phosphor-icons/react';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildWaveSegments, waveYBounds, type WaveSegment } from './cashflow-geometry';
import { deriveDailyFlowWindow } from './daily-cashflow';
import { formatFullDate, formatShortDate } from './date-display';
import type { FinanceData } from './finance-v4';
import { useI18n } from './i18n';
import './cashflow.css';

const DAY_WIDTH = 68;
const BASELINE = 106;
const AMPLITUDE = 69;
const PLOT_HEIGHT = 242;

function labelPosition(segments: WaveSegment[], x: number, width: number, y: number, income: boolean) {
  // Include the text's full width, so an adjacent slope cannot run through its label.
  const bounds = segments.map((segment) => waveYBounds(segment, x - width / 2, x + width / 2)).filter((bound) => bound !== null);
  return income
    ? Math.min(y, ...bounds.map((bound) => bound.min)) - 25
    : Math.max(y, ...bounds.map((bound) => bound.max)) + 10;
}

export function CashflowPanel({ data, today }: { data: FinanceData; today: string }) {
  return <DailyCashflowPanel key={today} data={data} today={today} />;
}

function DailyCashflowPanel({ data, today }: { data: FinanceData; today: string }) {
  const { locale, localeTag, formatCurrency } = useI18n();
  const vi = locale === 'vi';
  const id = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousTodayCenter = useRef<number | null>(null);
  const [measurement, setMeasurement] = useState<{ key: string; widths: number[] }>({ key: '', widths: [] });
  const days = useMemo(() => deriveDailyFlowWindow(data, today), [data, today]);
  const incomeLabel = vi ? 'Thu nhập' : 'Income';
  const expenseLabel = vi ? 'Chi tiêu' : 'Spending';
  const todayLabel = vi ? 'Hôm nay' : 'Today';
  const numberFormatter = useMemo(() => new Intl.NumberFormat(localeTag, { maximumFractionDigits: 0 }), [localeTag]);
  const missing = useMemo(() => {
    const dates = new Map<string, Set<'income' | 'expense'>>();
    for (const transaction of data.transactions) {
      if (transaction.reportingAmount !== undefined || (transaction.kind !== 'income' && transaction.kind !== 'expense')) continue;
      const kinds = dates.get(transaction.date) ?? new Set<'income' | 'expense'>();
      kinds.add(transaction.kind);
      dates.set(transaction.date, kinds);
    }
    return dates;
  }, [data.transactions]);
  const labels = useMemo(() => days.map((day) => {
    const awaiting = day.isFuture && day.transactionCount === 0;
    const incomeKnown = !awaiting && !missing.get(day.date)?.has('income');
    const expenseKnown = !awaiting && !missing.get(day.date)?.has('expense');
    return {
      incomeKnown, expenseKnown, awaiting,
      income: incomeKnown ? numberFormatter.format(day.income) : '—',
      expense: expenseKnown ? numberFormatter.format(day.expense) : '—',
    };
  }), [days, missing, numberFormatter]);
  const measurementKey = `${localeTag}:${labels.map((label) => `${label.income}/${label.expense}`).join('|')}`;
  const widths = useMemo(() => measurement.key === measurementKey ? measurement.widths : labels.map((label) => Math.max(DAY_WIDTH, Math.max(label.income.length, label.expense.length) * 7 + 12)), [labels, measurement, measurementKey]);
  const layout = useMemo(() => {
    const positions = widths.map((width, index) => {
      const left = widths.slice(0, index).reduce((sum, prior) => sum + prior, 0);
      return { left, width, x: left + width / 2 };
    });
    const scale = Math.max(1, ...days.flatMap((day, index) => [labels[index].incomeKnown ? day.income : 0, labels[index].expenseKnown ? day.expense : 0]));
    const income = buildWaveSegments(days.map((day, index) => labels[index].incomeKnown ? { x: positions[index].x, y: BASELINE - day.income / scale * AMPLITUDE } : null));
    const expense = buildWaveSegments(days.map((day, index) => labels[index].expenseKnown ? { x: positions[index].x, y: BASELINE + day.expense / scale * AMPLITUDE } : null));
    return { positions, width: widths.reduce((sum, width) => sum + width, 0), scale, income, expense };
  }, [days, labels, widths]);

  useEffect(() => {
    let active = true;
    const measure = () => {
      if (!active || !scrollRef.current) return;
      const measured = Array.from(scrollRef.current.querySelectorAll('.cf-day'), (day) => Math.max(DAY_WIDTH, ...Array.from(day.querySelectorAll('.cf-wave-value'), (label) => Math.ceil(label.getBoundingClientRect().width) + 12)));
      setMeasurement((prior) => prior.key === measurementKey && prior.widths.every((width, index) => width === measured[index]) ? prior : { key: measurementKey, widths: measured });
    };
    const frame = requestAnimationFrame(measure);
    void document.fonts.ready.then(measure);
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [measurementKey]);

  useLayoutEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const current = layout.positions[15];
    if (previousTodayCenter.current === null) viewport.scrollLeft = current.x - viewport.clientWidth / 2;
    else viewport.scrollLeft += current.x - previousTodayCenter.current;
    previousTodayCenter.current = current.x;
    let previousWidth = viewport.clientWidth;
    const preserveCenter = () => {
      viewport.scrollLeft += (previousWidth - viewport.clientWidth) / 2;
      previousWidth = viewport.clientWidth;
    };
    // Width changes preserve the current reading position; mounting on a new date centers today.
    const observer = new ResizeObserver(preserveCenter);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [layout.positions]);

  const renderSeries = (kind: 'income' | 'expense') => layout[kind].map((segment, index) => {
    const first = segment.points[0], last = segment.points[segment.points.length - 1];
    return segment.points.length > 1 && <g key={`${kind}-${index}`}>
      <path className={`cf-wave-area ${kind}`} d={`${segment.path} L${last.x},${BASELINE} L${first.x},${BASELINE} Z`} fill={`url(#${id}-${kind})`} />
      <path className={`cf-wave-trace ${kind}`} d={segment.path} />
    </g>;
  });

  return <section className="cashflow-panel cf-panel" aria-labelledby={`${id}-title`} data-layout-ready={measurement.key === measurementKey}>
    <div className="cf-heading"><h2 id={`${id}-title`}>{vi ? 'Thu nhập và chi tiêu' : 'Income and spending'}</h2><span className="cf-unit">VND</span></div>
    <div className="cf-series-labels"><span className="cf-income"><ArrowUp size={12} weight="bold" aria-hidden="true" />{incomeLabel}</span><span className="cf-expense"><ArrowDown size={12} weight="bold" aria-hidden="true" />{expenseLabel}</span></div>
    <p id={`${id}-description`} className="sr-only">{vi ? 'Thu nhập ở trên, chi tiêu ở dưới cùng một mốc không. Cả hai là số tiền dương. Vuốt ngang hoặc dùng phím mũi tên để xem 31 ngày. Dấu gạch ngang là ngày chưa nhập hoặc chưa đủ tỷ giá để tính tổng.' : 'Income above and spending below the same zero baseline, both positive amounts. Scroll sideways or use arrow keys to view 31 days. A dash means no future entry or missing exchange rates for a complete total.'}</p>
    <div ref={scrollRef} className="cf-day-scroll" role="region" tabIndex={0} aria-label={vi ? 'Thu chi 31 ngày' : '31-day income and spending'} aria-describedby={`${id}-description`}>
      <div className="cf-wave-plot" style={{ width: layout.width }} data-baseline={BASELINE}>
        <svg className="cf-wave-drawing" width={layout.width} height={PLOT_HEIGHT} viewBox={`0 0 ${layout.width} ${PLOT_HEIGHT}`} aria-hidden="true">
          <defs>{(['income', 'expense'] as const).map((kind) => <linearGradient key={kind} id={`${id}-${kind}`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={kind === 'income' ? BASELINE - AMPLITUDE : BASELINE} y2={kind === 'income' ? BASELINE : BASELINE + AMPLITUDE}><stop className={`cf-wave-stop ${kind}`} stopOpacity={kind === 'income' ? .31 : .015} /><stop className={`cf-wave-stop ${kind}`} offset="1" stopOpacity={kind === 'income' ? .015 : .3} /></linearGradient>)}</defs>
          {renderSeries('income')}{renderSeries('expense')}
          {days.flatMap((day, index) => (['income', 'expense'] as const).map((kind) => labels[index][`${kind}Known`] && day[kind] > 0 && <circle key={`${day.date}-${kind}`} className={`cf-wave-dot ${kind}${day.isFuture ? ' planned' : ''}`} data-date={day.date} data-kind={kind} cx={layout.positions[index].x} cy={BASELINE + (kind === 'income' ? -1 : 1) * day[kind] / layout.scale * AMPLITUDE} r="3.4" />))}
        </svg>
        <ol className="cf-days" aria-label={vi ? 'Thu chi theo ngày' : 'Daily income and spending'} style={{ width: layout.width }}>
          {days.map((day, index) => {
            const label = labels[index], position = layout.positions[index];
            const incomeY = label.incomeKnown ? BASELINE - day.income / layout.scale * AMPLITUDE : BASELINE;
            const expenseY = label.expenseKnown ? BASELINE + day.expense / layout.scale * AMPLITUDE : BASELINE;
            const amountDescription = label.awaiting ? (vi ? 'Chưa ghi giao dịch.' : 'No recorded entries.') : `${incomeLabel}: ${label.incomeKnown ? formatCurrency(day.income) : (vi ? 'chưa đủ tỷ giá' : 'missing exchange rates')}. ${expenseLabel}: ${label.expenseKnown ? formatCurrency(day.expense) : (vi ? 'chưa đủ tỷ giá' : 'missing exchange rates')}.`;
            return <li key={day.date} className="cf-day" data-date={day.date} data-income={day.income} data-expense={day.expense} style={{ left: position.left, width: position.width }} aria-label={`${formatFullDate(day.date)}${day.date === today ? `, ${todayLabel}` : ''}. ${amountDescription}${day.refunds > 0 ? ` ${vi ? 'Hoàn tiền ghi riêng' : 'Refunds recorded separately'}: ${formatCurrency(day.refunds)}.` : ''}${day.isFuture && day.transactionCount > 0 ? ` ${vi ? 'Đã ghi trước.' : 'Recorded ahead.'}` : ''}`}>
              <span className="cf-wave-value cf-day-income-value" style={{ top: labelPosition(layout.income, position.x, position.width - 6, incomeY, true) }} aria-hidden="true">{label.income}</span>
              <span className="cf-wave-value cf-day-expense-value" style={{ top: labelPosition(layout.expense, position.x, position.width - 6, expenseY, false) }} aria-hidden="true">{label.expense}</span>
              <span className="cf-day-date" aria-hidden="true"><time dateTime={day.date}>{formatShortDate(day.date)}</time>{day.date === today && <small>{todayLabel}</small>}</span>
            </li>;
          })}
        </ol>
      </div>
    </div>
  </section>;
}
