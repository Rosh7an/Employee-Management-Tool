import type { ReactNode } from 'react';

interface Props {
  title?: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">○</div>
      {title && <p className="empty-state-title">{title}</p>}
      <p className="empty-state-desc">{message}</p>
      {action}
    </div>
  );
}
