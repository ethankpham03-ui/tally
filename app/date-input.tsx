'use client';

import { CalendarBlank } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { isValidDateOnly } from './finance-domain';
import { formatDateInputDraft, formatFullDate, parseDisplayDate } from './date-display';
import { useI18n } from './i18n';
import './date-input.css';

export type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  calendarLabel?: string;
};

export function DateInput({ value, onValueChange, calendarLabel, min, max, required, disabled, readOnly, className, onBlur, ...props }: DateInputProps) {
  const { locale } = useI18n();
  const vi = locale === 'vi';
  const displayValue = (iso: string) => isValidDateOnly(iso) ? formatFullDate(iso) : iso;
  const [inputState, setInputState] = useState(() => ({ value, draft: displayValue(value) }));
  // An echoed empty value retains partial input; an external value resets its display.
  const draft = value === inputState.value ? inputState.draft : displayValue(value);
  const textRef = useRef<HTMLInputElement>(null);
  const earliest = typeof min === 'string' && isValidDateOnly(min) ? min : undefined;
  const latest = typeof max === 'string' && isValidDateOnly(max) ? max : undefined;

  useEffect(() => {
    const parsed = parseDisplayDate(draft);
    const invalid = draft !== '' && parsed === null;
    const outsideRange = parsed && ((earliest && parsed < earliest) || (latest && parsed > latest));
    const message = invalid ? (vi ? 'Nhập ngày hợp lệ theo dạng dd/mm/yyyy.' : 'Enter a valid date as dd/mm/yyyy.')
      : outsideRange ? (vi ? 'Chọn ngày trong khoảng cho phép.' : 'Choose a date within the allowed range.') : '';
    textRef.current?.setCustomValidity(message);
  }, [draft, earliest, latest, vi]);

  function updateDraft(next: string) {
    const iso = parseDisplayDate(next) ?? '';
    setInputState({ value: iso, draft: next });
    onValueChange(iso);
  }

  return <span className={`date-input-control${disabled ? ' is-disabled' : ''}`}>
    <input {...props} ref={textRef} type="text" className={`date-input-text ${className ?? ''}`.trim()} value={draft}
      placeholder={props.placeholder ?? 'dd/mm/yyyy'} inputMode="numeric" autoComplete={props.autoComplete ?? 'off'}
      required={required} disabled={disabled} readOnly={readOnly}
      onChange={(event) => updateDraft(formatDateInputDraft(event.target.value))}
      onBlur={(event) => { const parsed = parseDisplayDate(draft); if (parsed) setInputState({ value: parsed, draft: formatFullDate(parsed) }); onBlur?.(event); }} />
    <span className="date-input-calendar">
      <CalendarBlank size={20} weight="bold" aria-hidden="true" />
      <input type="date" className="date-input-picker" value={isValidDateOnly(value) ? value : ''} min={earliest} max={latest}
        disabled={disabled || readOnly} aria-label={calendarLabel ?? (vi ? 'Chọn ngày từ lịch' : 'Choose date from calendar')}
        aria-invalid={props['aria-invalid']} aria-describedby={props['aria-describedby']}
        onChange={(event) => updateDraft(event.target.value ? formatFullDate(event.target.value) : '')}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); try { event.currentTarget.showPicker(); } catch { event.currentTarget.click(); } } }} />
    </span>
  </span>;
}
