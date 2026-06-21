import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function TextField({ label, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? props.name ?? generatedId;

  return (
    <div className={`field${label ? '' : ' field-without-label'}`}>
      {label && <label htmlFor={fieldId}>{label}</label>}
      <input id={fieldId} aria-label={label ?? props.placeholder ?? 'Trường nhập liệu'} {...props} />
    </div>
  );
}
