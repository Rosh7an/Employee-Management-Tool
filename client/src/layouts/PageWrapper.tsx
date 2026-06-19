import type { ReactNode } from 'react';

interface Props {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function PageWrapper({ title, action, children }: Props) {
  return (
    <>
      <div className="page-header">
        <h1>{title}</h1>
        {action}
      </div>
      <div className="page-body">{children}</div>
    </>
  );
}
