import type { TextareaHTMLAttributes } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function TextArea({ label, id, rows = 4, ...props }: TextAreaProps) {
  const fieldId = id ?? props.name ?? label;

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <textarea id={fieldId} rows={rows} {...props} />
    </div>
  );
}
