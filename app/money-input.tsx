'use client';

import { forwardRef, useCallback, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { CURRENCY_DECIMALS, type Currency } from './money.ts';
import { applyMoneyInputEdit, formatMoneyInputValue, reconcileMoneyInputChange, type MoneyInputEditResult } from './money-input-format.ts';

export type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string;
  onValueChange: (value: string) => void;
  currency: Currency;
  signed?: boolean;
  decimalPlaces?: number;
};

/** Controlled canonical value, with a locale-independent banking display. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput({
  value, onValueChange, currency, signed = false, decimalPlaces,
  onKeyDown, onPaste, onCompositionStart, onCompositionEnd, inputMode,
  ...props
}, forwardedRef) {
  const decimals = decimalPlaces ?? CURRENCY_DECIMALS[currency];
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [compositionValue, setCompositionValue] = useState<string | null>(null);
  const pendingSelection = useRef<{ start: number; end: number; display: string } | null>(null);
  const setRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  const commit = useCallback((result: MoneyInputEditResult) => {
    const input = inputRef.current;
    pendingSelection.current = { start: result.selectionStart, end: result.selectionEnd, display: result.displayValue };
    if (input) {
      input.value = result.displayValue;
      input.setSelectionRange(result.selectionStart, result.selectionEnd);
    }
    if (result.accepted && result.value !== value) onValueChange(result.value);
  }, [onValueChange, value]);

  // Native beforeinput also covers iOS/Android keyboards; React's synthetic
  // beforeinput does not consistently expose the inputType needed for deletion.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const beforeInput = (event: InputEvent) => {
      if (!event.cancelable || event.defaultPrevented || event.isComposing || composing.current || input.disabled || input.readOnly) return;
      let kind: 'insert' | 'backspace' | 'delete';
      if (event.inputType === 'deleteContentBackward') kind = 'backspace';
      else if (event.inputType === 'deleteContentForward') kind = 'delete';
      else if (event.inputType === 'insertText' && event.data !== null) kind = 'insert';
      else return;
      const result = applyMoneyInputEdit(value, {
        start: input.selectionStart ?? 0, end: input.selectionEnd ?? 0, kind, text: event.data ?? '',
      }, { decimalPlaces: decimals, signed });
      event.preventDefault();
      commit(result);
    };
    input.addEventListener('beforeinput', beforeInput);
    return () => input.removeEventListener('beforeinput', beforeInput);
  }, [commit, decimals, signed, value]);

  useLayoutEffect(() => {
    const input = inputRef.current, pending = pendingSelection.current;
    if (input && pending && document.activeElement === input && input.value === pending.display) {
      input.setSelectionRange(pending.start, pending.end);
    }
    pendingSelection.current = null;
  });

  return <input {...props} ref={setRef} type="text" inputMode={inputMode ?? (signed ? 'text' : decimals ? 'decimal' : 'numeric')}
    value={compositionValue ?? formatMoneyInputValue(value)}
    onKeyDown={(event) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || composing.current || event.currentTarget.readOnly || event.currentTarget.disabled
        || event.altKey || event.ctrlKey || event.metaKey || (event.key !== 'Backspace' && event.key !== 'Delete')) return;
      event.preventDefault();
      commit(applyMoneyInputEdit(value, {
        start: event.currentTarget.selectionStart ?? 0, end: event.currentTarget.selectionEnd ?? 0,
        kind: event.key === 'Backspace' ? 'backspace' : 'delete',
      }, { decimalPlaces: decimals, signed }));
    }}
    onPaste={(event) => {
      onPaste?.(event);
      if (event.defaultPrevented || event.currentTarget.readOnly || event.currentTarget.disabled) return;
      event.preventDefault();
      commit(applyMoneyInputEdit(value, {
        start: event.currentTarget.selectionStart ?? 0, end: event.currentTarget.selectionEnd ?? 0,
        kind: 'paste', text: event.clipboardData.getData('text/plain'),
      }, { decimalPlaces: decimals, signed }));
    }}
    onChange={(event) => {
      if (composing.current) { setCompositionValue(event.currentTarget.value); return; }
      const native = event.nativeEvent as InputEvent;
      commit(reconcileMoneyInputChange(value, event.currentTarget.value, event.currentTarget.selectionStart ?? 0,
        native.inputType ?? '', native.data ?? null, { decimalPlaces: decimals, signed }));
    }}
    onCompositionStart={(event) => {
      composing.current = true;
      setCompositionValue(event.currentTarget.value);
      onCompositionStart?.(event);
    }}
    onCompositionEnd={(event) => {
      composing.current = false;
      setCompositionValue(null);
      commit(applyMoneyInputEdit(value, { start: 0, end: formatMoneyInputValue(value).length, kind: 'paste', text: event.currentTarget.value }, { decimalPlaces: decimals, signed }));
      onCompositionEnd?.(event);
    }} />;
});
