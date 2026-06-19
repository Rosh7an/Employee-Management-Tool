import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { Pagination } from '../../components/Pagination';
import { auditApi, AuditLog } from './audit.api';

const ROLES = ['admin', 'manager', 'employee'];
const todayStr = new Date().toISOString().slice(0, 10);

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function resetPage() { setPage(1); }

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', page, search, actorRole, from, to],
    queryFn: () =>
      auditApi.list({
        page,
        search: search || undefined,
        actorRole: actorRole || undefined,
        from: from || undefined,
        to: to || undefined,
      }).then((r) => r.data),
  });

  const logs: AuditLog[] = data?.data || [];
  const meta = data?.meta;

  function actorName(log: AuditLog) {
    if (log.actorId && typeof log.actorId === 'object') return log.actorId.name;
    return '—';
  }

  const hasFilters = search || actorRole || from || to;

  function clearFilters() {
    setSearch('');
    setActorRole('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <PageWrapper title="Audit Logs">
      {error && <ErrorBanner error={error} />}

      <div className="filter-bar">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Search actor, action, resource…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage(); }}
        />
        <select
          className="input"
          style={{ maxWidth: 130 }}
          value={actorRole}
          onChange={(e) => { setActorRole(e.target.value); resetPage(); }}
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>
          ))}
        </select>
        <input
          className="input"
          type="date"
          style={{ maxWidth: 150 }}
          title="From date"
          max={todayStr}
          value={from}
          onChange={(e) => { setFrom(e.target.value); resetPage(); }}
        />
        <input
          className="input"
          type="date"
          style={{ maxWidth: 150 }}
          title="To date"
          max={todayStr}
          value={to}
          onChange={(e) => { setTo(e.target.value); resetPage(); }}
        />
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
        )}
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
