import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { Pagination } from '../../components/Pagination';
import { useAuthStore } from '../../store/auth.store';
import { attendanceApi, AttendanceRecord } from './attendance.api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_SYMBOLS: Record<string, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  'half-day': 'H',
  holiday: '—',
};

export function AttendancePage() {
  const { user } = useAuthStore();
  const now = new Date();
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, error } = useQuery({
    queryKey: ['attendance', page, month, year],
    queryFn: () => attendanceApi.list({ page, month, year }).then((r) => r.data),
  });

  const records: AttendanceRecord[] = data?.data?.attendance || data?.data || [];
  const meta = data?.meta;

  function employeeName(r: AttendanceRecord) {
    if (typeof r.employeeId === 'object') return r.employeeId.name;
    return '—';
  }

  return (
    <PageWrapper title="Attendance">
      {error && <ErrorBanner error={error} />}

      <div className="filter-bar">
        <select className="input" style={{ width: 140 }} value={month} onChange={(e) => { setMonth(Number(e.target.value)); setPage(1); }}>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <input
          className="input"
          type="number"
          value={year}
          min={2020}
          max={2030}
          style={{ width: 100 }}
          onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}
        />
      </div>

      {isLoading && <div className="loading-page">Loading...</div>}
      {!isLoading && records.length === 0 && <EmptyState message="No attendance records found." />}

      {records.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {user?.role !== 'employee' && <th>Employee</th>}
                <th>Date</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  {user?.role !== 'employee' && <td>{employeeName(r)}</td>}
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                      {STATUS_SYMBOLS[r.status] || r.status}
                    </span>{' '}
                    <span style={{ fontSize: 12, color: 'var(--gray-600)', textTransform: 'capitalize' }}>{r.status}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{r.checkIn || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{r.checkOut || '—'}</td>
                  <td style={{ color: 'var(--gray-600)', fontSize: 13 }}>{r.note || '—'}</td>
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
