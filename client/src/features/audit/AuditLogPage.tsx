import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { Pagination } from '../../components/Pagination';
import { auditApi, AuditLog } from './audit.api';

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', page, action],
    queryFn: () =>
      auditApi.list({ page, action: action || undefined }).then((r) => r.data),
  });

  const logs: AuditLog[] = data?.data || [];
  const meta = data?.meta;

  function actorName(log: AuditLog) {
    if (typeof log.actorId === 'object') return log.actorId.name;
    return '—';
  }

  return (
    <PageWrapper title="Audit Logs">
      {error && <ErrorBanner error={error} />}

      <div className="filter-bar">
        <input
          className="input"
          style={{ maxWidth: 220 }}
          placeholder="Filter by action…"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading && <div className="loading-page">Loading…</div>}
      {!isLoading && logs.length === 0 && <EmptyState message="No audit logs found." />}

      {logs.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Resource</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 500 }}>{actorName(log)}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--t3)' }}>
                      {log.actorRole}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>{log.action}</span>
                  </td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--t2)' }}>
                    {log.targetModel || '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-600)' }}>
                    {log.ip || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta && <Pagination meta={meta} onPage={setPage} />}
        </div>
      )}
    </PageWrapper>
  );
}
