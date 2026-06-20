import type { PropsWithChildren, ReactNode } from 'react';

interface SoftCardProps extends PropsWithChildren {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SoftCard({ title, description, action, className = '', children }: SoftCardProps) {
  return (
    <article className={`soft-card ${className}`.trim()}>
      {(title || description || action) && (
        <header className="soft-card-header">
          <div>
            {title && <h2 className="soft-card-title">{title}</h2>}
            {description && <p className="soft-card-description">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </article>
  );
}
