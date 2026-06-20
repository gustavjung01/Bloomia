import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
}

export function SelectField({ label, id, options, ...props }: SelectFieldProps) {
  const fieldId = id ?? props.name ?? label;

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <select id={fieldId} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
