import type { PropsWithChildren } from 'react';

type BadgeTone = 'pink' | 'sage' | 'lavender' | 'peach';

interface BadgeProps extends PropsWithChildren {
  tone?: BadgeTone;
}

export function Badge({ tone = 'pink', children }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
