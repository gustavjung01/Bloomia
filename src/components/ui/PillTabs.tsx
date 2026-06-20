export interface PillTabOption<TValue extends string> {
  label: string;
  value: TValue;
}

interface PillTabsProps<TValue extends string> {
  value: TValue;
  options: PillTabOption<TValue>[];
  onChange: (value: TValue) => void;
}

export function PillTabs<TValue extends string>({ value, options, onChange }: PillTabsProps<TValue>) {
  return (
    <div className="pill-tabs" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={`pill-tab${option.value === value ? ' is-active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
