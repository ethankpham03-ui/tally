'use client';

import { CaretDown, MagnifyingGlass, Plus, X } from '@phosphor-icons/react';
import { useId, useMemo, useState } from 'react';
import { CategoryIcon, CUSTOM_CATEGORY_ICON_IDS } from './category-icons';
import {
  EXPENSE_CATEGORY_DEFINITIONS,
  createId,
  expenseCategoryDefinition,
  isBuiltInExpenseCategory,
  type CategoryIconId,
  type CustomExpenseCategory,
  type ExpenseCategoryGroupId,
  type ExpenseCategoryId,
} from './finance-domain';
import { useI18n, type TranslationCatalog } from './i18n';

type CategoryPickerProps = {
  label: string;
  value: ExpenseCategoryId;
  customCategories: readonly CustomExpenseCategory[];
  onChange: (category: ExpenseCategoryId, created?: CustomExpenseCategory) => void;
  autoFocus?: boolean;
  error?: string;
  errorId?: string;
};

const groupIds = Array.from(new Set(EXPENSE_CATEGORY_DEFINITIONS.map((category) => category.group))) as ExpenseCategoryGroupId[];

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase()
    .trim();
}

export function expenseCategoryLabel(
  catalog: TranslationCatalog,
  category: ExpenseCategoryId,
  customCategories: readonly CustomExpenseCategory[],
) {
  if (isBuiltInExpenseCategory(category)) return catalog.categories[category];
  return customCategories.find((item) => item.id === category)?.name ?? catalog.categories.other;
}

export function expenseCategoryIcon(
  category: ExpenseCategoryId,
  customCategories: readonly CustomExpenseCategory[],
): CategoryIconId {
  if (isBuiltInExpenseCategory(category)) return expenseCategoryDefinition(category).icon;
  return customCategories.find((item) => item.id === category)?.icon ?? 'dots';
}

export function CategoryPicker({
  label,
  value,
  customCategories,
  onChange,
  autoFocus = false,
  error,
  errorId,
}: CategoryPickerProps) {
  const { c, t } = useI18n();
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState<CategoryIconId>('sparkle');
  const [customError, setCustomError] = useState('');
  const selectedIcon = value === 'other' ? 'dots' : expenseCategoryIcon(value, customCategories);
  const selectedLabel = expenseCategoryLabel(c, value, customCategories);
  const normalizedQuery = normalizeSearch(query);

  const matches = useMemo(() => EXPENSE_CATEGORY_DEFINITIONS.filter((category) => {
    if (category.id === 'other') return false;
    if (!normalizedQuery) return true;
    const labelText = c.categories[category.id];
    const groupText = c.categoryGroups[category.group];
    return normalizeSearch(`${labelText} ${groupText}`).includes(normalizedQuery);
  }), [c, normalizedQuery]);

  const matchingCustom = useMemo(() => customCategories.filter((category) => (
    !normalizedQuery || normalizeSearch(category.name).includes(normalizedQuery)
  )), [customCategories, normalizedQuery]);

  function choose(category: ExpenseCategoryId) {
    onChange(category);
    setIsOpen(false);
    setQuery('');
  }

  function startCreating() {
    setIsCreating(true);
    setCustomName('');
    setCustomIcon('sparkle');
    setCustomError('');
  }

  function saveCustom() {
    const name = customName.trim();
    if (!name) { setCustomError(c.validation.customCategoryName); return; }
    if (customCategories.some((category) => normalizeSearch(category.name) === normalizeSearch(name))) {
      setCustomError(c.validation.customCategoryDuplicate);
      return;
    }
    const created: CustomExpenseCategory = {
      id: `custom:${createId('category')}`,
      name,
      icon: customIcon,
    };
    onChange(created.id, created);
    setIsCreating(false);
    setIsOpen(false);
    setQuery('');
  }

  return (
    <div className="field category-picker-field">
      <span>{label}</span>
      <button
        autoFocus={autoFocus}
        type="button"
        className="category-picker-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={`${c.categoryPicker.openAria}: ${selectedLabel}`}
        data-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        onClick={() => { setIsOpen((current) => !current); setIsCreating(false); }}
      >
        <span className="category-picker-leading"><i><CategoryIcon icon={selectedIcon} size={19} weight="regular" aria-hidden="true" /></i><strong>{selectedLabel}</strong></span>
        <CaretDown size={17} weight="bold" aria-hidden="true" />
      </button>

      {isOpen && (
        <section id={panelId} className="category-picker-panel" aria-label={c.categoryPicker.title}>
          <header className="category-picker-header">
            <strong>{isCreating ? c.categoryPicker.createCustom : c.categoryPicker.title}</strong>
            <button type="button" onClick={() => setIsOpen(false)} aria-label={c.common.close}><X size={18} weight="bold" aria-hidden="true" /></button>
          </header>

          {isCreating ? (
            <div className="custom-category-editor">
              <p>{c.categoryPicker.customHelp}</p>
              <label className="field"><span>{c.categoryPicker.customName}</span><input value={customName} onChange={(event) => { setCustomName(event.target.value); setCustomError(''); }} maxLength={40} placeholder={c.categoryPicker.customNamePlaceholder} aria-invalid={Boolean(customError)} aria-describedby={customError ? `${panelId}-custom-error` : undefined} />{customError && <small id={`${panelId}-custom-error`} className="field-error" role="alert">{customError}</small>}</label>
              <fieldset className="custom-icon-picker"><legend>{c.categoryPicker.customIcon}</legend><div>{CUSTOM_CATEGORY_ICON_IDS.map((icon, index) => <button key={icon} type="button" className={customIcon === icon ? 'is-selected' : ''} onClick={() => setCustomIcon(icon)} aria-pressed={customIcon === icon} aria-label={t('categoryPicker.iconOption', { number: index + 1 })}><CategoryIcon icon={icon} size={20} weight={customIcon === icon ? 'fill' : 'regular'} aria-hidden="true" /></button>)}</div></fieldset>
              <div className="custom-category-actions"><button type="button" className="cancel-action" onClick={() => setIsCreating(false)}>{c.categoryPicker.back}</button><button type="button" className="primary-action" onClick={saveCustom}>{c.categoryPicker.saveCustom}</button></div>
            </div>
          ) : (
            <>
              <label className="category-search"><MagnifyingGlass size={18} weight="regular" aria-hidden="true" /><span className="sr-only">{c.categoryPicker.search}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.categoryPicker.search} /></label>
              <div className="category-picker-scroll">
                {matchingCustom.length > 0 && <div className="category-picker-group"><h3>{c.categoryPicker.customSection}</h3><div className="category-choice-grid">{matchingCustom.map((category) => <button key={category.id} type="button" className={value === category.id ? 'is-selected' : ''} onClick={() => choose(category.id)}><CategoryIcon icon={category.icon} size={19} weight={value === category.id ? 'fill' : 'regular'} aria-hidden="true" /><span>{category.name}</span></button>)}</div></div>}
                {groupIds.filter((group) => group !== 'other').map((group) => {
                  const categories = matches.filter((category) => category.group === group);
                  if (categories.length === 0) return null;
                  return <div className="category-picker-group" key={group}><h3>{c.categoryGroups[group]}</h3><div className="category-choice-grid">{categories.map((category) => <button key={category.id} type="button" className={value === category.id ? 'is-selected' : ''} onClick={() => choose(category.id)}><CategoryIcon icon={category.icon} size={19} weight={value === category.id ? 'fill' : 'regular'} aria-hidden="true" /><span>{c.categories[category.id]}</span></button>)}</div></div>;
                })}
                {matches.length === 0 && matchingCustom.length === 0 && <p className="category-no-results">{c.categoryPicker.noResults}</p>}
              </div>
              <button type="button" className="category-custom-action" onClick={startCreating}><Plus size={18} weight="bold" aria-hidden="true" /><span><strong>{c.categoryPicker.createCustom}</strong><small>{c.categoryPicker.customHelp}</small></span></button>
            </>
          )}
        </section>
      )}
      {error && <small id={errorId} className="field-error" role="alert">{error}</small>}
    </div>
  );
}
