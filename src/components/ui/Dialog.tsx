import type { PropsWithChildren } from 'react';

import { Button } from './Button';

interface DialogProps extends PropsWithChildren {
  open: boolean;
  title: string;
  onClose: () => void;
  className?: string;
}

export function Dialog({ open, title, onClose, className = '', children }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className={`dialog-panel ${className}`.trim()} role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="soft-card-header">
          <h2 className="soft-card-title">{title}</h2>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
        </div>
        {children}
      </section>
    </div>
  );
}
