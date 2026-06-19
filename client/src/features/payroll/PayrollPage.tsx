import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { Pagination } from '../../components/Pagination';
import { useAuthStore } from '../../store/auth.store';
import { payrollApi, PayrollRecord } from './payroll.api';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i);

export function PayrollPage() {
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(0);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const { data, isLoading, error } = useQuery({
    queryKey: ['payroll', page, year, month, sortDir],
    queryFn: () =>
      payrollApi.list({ page, year: year || undefined, month: month || undefined, sort: sortDir }).then((r) => r.data),
  });

  const records: PayrollRecord[] = data?.data || [];
  const meta = data?.meta;

  function employeeName(r: PayrollRecord) {
    return typeof r.employeeId === 'object' ? r.employeeId.name : '—';
  }
  function employeeCode(r: PayrollRecord) {
    return typeof r.employeeId === 'object' ? r.employeeId.employeeId : '—';
  }

  return (
    <PageWrapper title="Payroll">
      {error && <ErrorBanner error={error} />}

      <div className="filter-bar">
        {/* Year */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="input-label">Year</label>
          <select
            className="input"
            style={{ width: 110 }}
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}
          >
            <option value={0}>All years</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Month */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="input-label">Month</label>
          <select
            className="input"
            style={{ width: 140 }}
            value={month}
            onChange={(e) => { setMonth(Number(e.target.value)); setPage(1); }}
          >
            <option value={0}>All months</option>
            {MONTH_NAMES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}

          </select>
        </div>

        {/* Sort direction */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="input-label">Sort</label>
          <select
            className="input"
            style={{ width: 160 }}
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as 'desc' | 'asc')}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>

      {isLoading && <div className="loading-page">Loading…</div>}
      {!isLoading && records.length === 0 && <EmptyState message="No payroll records found." />}

      {records.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {user?.role !== 'employee' && <th>Employee</th>}
                <th>Period</th>
                <th>Basic</th>
                <th>Bonuses</th>
                <th>Deductions</th>
                <th>Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  {user?.role !== 'employee' && (
                    <td>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--gray-600)', marginRight: 6 }}>{employeeCode(r)}</span>
                      {employeeName(r)}
                    </td>
                  )}
                  <td>{r.payPeriod}</td>
                  <td>${r.base.toLocaleString()}</td>
                  <td style={{ color: r.bonuses > 0 ? 'inherit' : 'var(--gray-600)' }}>+${r.bonuses.toLocaleString()}</td>
                  <td style={{ opacity: r.deductions > 0 ? 1 : 0.4 }}>-${r.deductions.toLocaleString()}</td>
                  <td><strong>${r.netPay.toLocaleString()}</strong></td>
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
