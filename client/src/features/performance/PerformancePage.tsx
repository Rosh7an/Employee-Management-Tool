import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { Pagination } from '../../components/Pagination';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useAuthStore } from '../../store/auth.store';
import { performanceApi, PerformanceReview, PerformanceQuarter } from './performance.api';
import { employeesApi, Employee } from '../employees/employees.api';
import { PerformanceForm } from './PerformanceForm';
import { useToast } from '../../hooks/useToast';
import { extractApiError } from '../../lib/axios';

function periodToSort(p: string) {
  const m = p.match(/Q(\d)\s+(\d{4})/);
  if (!m) return 0;
  return parseInt(m[2]) * 10 + parseInt(m[1]);
}
function abbreviatePeriod(p: string) {
  return p.replace(/(\d{4})/, (y) => `'${y.slice(2)}`);
}
function employeeName(r: PerformanceReview) {
  return r.employeeId && typeof r.employeeId === 'object' ? r.employeeId.name : '—';
}
function reviewerName(r: PerformanceReview) {
  return r.reviewerId && typeof r.reviewerId === 'object' ? r.reviewerId.name : '—';
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ fontSize: 13, color: n <= rating ? '#f59e0b' : '#d1d5db' }}>★</span>
      ))}
      <span style={{ marginLeft: 4, fontWeight: 600, fontSize: 12, color: 'var(--t2)' }}>{rating}/5</span>
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>{label}</div>
      <div style={{ fontSize: 13 }}>Rating: <strong>{payload[0].value}/5</strong></div>
    </div>
  );
}

export function PerformancePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editReview, setEditReview] = useState<PerformanceReview | null>(null);
  const [filterEmpId, setFilterEmpId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showQuarterForm, setShowQuarterForm] = useState(false);
  const [quarterPeriod, setQuarterPeriod] = useState('');
  const [quarterDueDate, setQuarterDueDate] = useState('');

  const isAdmin = user?.role === 'admin';
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const isEmployee = user?.role === 'employee';
  const todayStr = new Date().toISOString().slice(0, 10);
  const isDueDatePast = !!quarterDueDate && quarterDueDate < todayStr;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['performance', page, filterEmpId],
    queryFn: () => performanceApi.list({ page, employeeId: filterEmpId || undefined }).then((r) => r.data),
  });
  const reviews: PerformanceReview[] = data?.data || [];
  const meta = data?.meta;

  const chartEmpId = isEmployee ? undefined : (filterEmpId || undefined);
  const { data: chartData } = useQuery({
    queryKey: ['performance-chart', chartEmpId],
    queryFn: () => performanceApi.listByEmployee(chartEmpId!).then((r) => r.data.data as PerformanceReview[]),
    enabled: !!chartEmpId,
  });
  const { data: myChartData } = useQuery({
    queryKey: ['performance-my-chart'],
    queryFn: () => performanceApi.list({ page: 1 }).then((r) => r.data),
    enabled: isEmployee,
  });
  const rawChartReviews: PerformanceReview[] = isEmployee
    ? (myChartData?.data || [])
    : (chartData || []);
  const sortedChart = [...rawChartReviews].sort((a, b) => periodToSort(a.period) - periodToSort(b.period));
  const chartPoints = sortedChart.map((r) => ({ period: abbreviatePeriod(r.period), rating: r.rating }));
  const avg = chartPoints.length
    ? (chartPoints.reduce((s, p) => s + p.rating, 0) / chartPoints.length).toFixed(1)
    : null;

  const { data: empData } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeesApi.list({ limit: 100 }).then((r) => r.data),
    enabled: canManage,
  });
  const employees: Employee[] = empData?.data?.employees || empData?.data || [];

  const { data: quartersData, refetch: refetchQuarters } = useQuery({
    queryKey: ['performance-quarters'],
    queryFn: () => performanceApi.listQuarters().then((r) => r.data.data as PerformanceQuarter[]),
  });
  const quarters = quartersData || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => performanceApi.delete(id),
    onSuccess: () => {
      setDeleteTarget(null);
      refetch();
      qc.invalidateQueries({ queryKey: ['performance-chart'] });
      toast.success('Review deleted.');
    },
    onError: (e: unknown) => toast.error(extractApiError(e, 'Delete failed.').message),
  });

  const createQuarterMutation = useMutation({
    mutationFn: () => performanceApi.createQuarter({ period: quarterPeriod, dueDate: quarterDueDate }),
    onSuccess: () => {
      setShowQuarterForm(false);
      setQuarterPeriod('');
      setQuarterDueDate('');
      refetchQuarters();
      toast.success(`Quarter ${quarterPeriod} opened.`);
    },
    onError: (e: unknown) => toast.error(extractApiError(e, 'Failed to open quarter.').message),
  });

  const lockMutation = useMutation({
    mutationFn: (id: string) => performanceApi.lockQuarter(id),
    onSuccess: () => { refetchQuarters(); toast.success('Quarter locked.'); },
    onError: (e: unknown) => toast.error(extractApiError(e, 'Lock failed.').message),
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => performanceApi.unlockQuarter(id),
    onSuccess: () => { refetchQuarters(); toast.success('Quarter unlocked.'); },
    onError: (e: unknown) => toast.error(extractApiError(e, 'Unlock failed.').message),
  });

  function openSuccess() {
    setShowForm(false);
    setEditReview(null);
    refetch();
    qc.invalidateQueries({ queryKey: ['performance-chart'] });
    toast.success(editReview ? 'Review updated.' : 'Review added.');
  }

  if (showForm || editReview) {
    return (
      <PageWrapper title={editReview ? 'Edit Review' : 'Add Review'} action={
        <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditReview(null); }}>Cancel</button>
      }>
        <PerformanceForm review={editReview || undefined} openQuarters={quarters.filter((q) => q.status === 'open')} onSuccess={openSuccess} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Performance"
      action={
        canManage && quarters.some((q) => q.status === 'open') ? (
          <button className="btn" onClick={() => setShowForm(true)}>+ Add Review</button>
        ) : canManage ? (
          <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>No open review period</span>
        ) : undefined
      }
    >
      {error && <ErrorBanner error={error} />}

      {/* Review Periods — admin only */}
      {isAdmin && (
        <div className="detail-section" style={{ marginBottom: 'var(--sp-5)' }}>
          <div className="detail-section-header">
            <h2>Review Periods</h2>
            <button className="btn btn-sm" onClick={() => setShowQuarterForm((v) => !v)}>
              {showQuarterForm ? 'Cancel' : '+ Start Period'}
            </button>
          </div>

          {showQuarterForm && (
            <div style={{ padding: '24px', marginBottom: 'var(--sp-4)', background: 'var(--s1)', border: '1px solid var(--s3)', borderRadius: 'var(--r-md)' }}>
              <div className="form-section-label">New Review Period</div>
              <form
                onSubmit={(e) => { e.preventDefault(); createQuarterMutation.mutate(); }}
                style={{ margin: 0 }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24, rowGap: 0, alignItems: 'start', marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Period</label>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Due Date</label>
                  <div className="input-group">
                    <input
                      className="input"
                      style={{ height: 44 }}
                      placeholder="e.g. Q3 2026"
                      value={quarterPeriod}
                      onChange={(e) => setQuarterPeriod(e.target.value)}
                      pattern="Q[1-4] \d{4}"
                      required
                    />
                    <span style={{ fontSize: 11.5, color: 'var(--t3)' }}>Format: Q1 2026</span>
                  </div>
                  <div>
                    <input
                      className={`input${isDueDatePast ? ' has-error' : ''}`}
                      style={{ height: 44 }}
                      type="date"
                      min={todayStr}
                      value={quarterDueDate}
                      onChange={(e) => setQuarterDueDate(e.target.value)}
                      required
                    />
                    {isDueDatePast && (
                      <span className="input-error-msg">Due date must be today or in the future.</span>
                    )}
                  </div>
                </div>
                <button className="form-btn" type="submit" disabled={createQuarterMutation.isPending || isDueDatePast}>
                  {createQuarterMutation.isPending ? <span className="spinner" /> : 'Open Period'}
                </button>
              </form>
            </div>
          )}

          {quarters.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--t3)' }}>No review periods defined. Start one to allow team leads to submit reviews.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Period</th><th>Due Date</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {quarters.map((q) => (
                    <tr key={q._id}>
                      <td><span className="mono">{q.period}</span></td>
                      <td style={{ color: 'var(--t2)' }}>{new Date(q.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td>
                        <span className={`quarter-badge quarter-badge-${q.status}`}>
                          {q.status === 'open' ? 'Open' : 'Locked'}
                        </span>
                      </td>
                      <td>
                        {q.status === 'open' ? (
                          <button className="btn btn-outline btn-xs" onClick={() => lockMutation.mutate(q._id)}>Lock</button>
                        ) : (
                          <button className="btn btn-outline btn-xs" onClick={() => unlockMutation.mutate(q._id)}>Unlock</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Filter bar */}
      {canManage && (
        <div className="filter-bar">
          <select className="input" style={{ width: 260 }} value={filterEmpId} onChange={(e) => { setFilterEmpId(e.target.value); setPage(1); }}>
            <option value="">All employees</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>
            ))}
          </select>
          {filterEmpId && <button className="btn btn-ghost btn-sm" onClick={() => { setFilterEmpId(''); setPage(1); }}>Clear</button>}
        </div>
      )}

      {/* Growth chart */}
      {chartPoints.length >= 2 && (
        <div className="perf-chart-card">
          <div className="perf-chart-header">
            <span className="perf-chart-title">Growth Trajectory</span>
            <span className="perf-chart-avg">Avg <strong>{avg}</strong> / 5 over {chartPoints.length} quarters</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartPoints} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={24} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={Number(avg)} stroke="#d1d5db" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="rating" stroke="#0f0f0f" strokeWidth={2}
                dot={{ r: 4, fill: '#0f0f0f', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#0f0f0f' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {isLoading && <div className="loading-page">Loading…</div>}
      {!isLoading && reviews.length === 0 && (
        <EmptyState title="No reviews" message="No performance reviews found." />
      )}

      {reviews.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {!isEmployee && <th>Employee</th>}
                  <th>Period</th>
                  <th>Rating</th>
                  <th>Reviewer</th>
                  <th>Notes</th>
                  <th>Date</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r._id}>
                    {!isEmployee && <td style={{ fontWeight: 500 }}>{employeeName(r)}</td>}
                    <td><span className="mono">{r.period}</span></td>
                    <td><RatingStars rating={r.rating} /></td>
                    <td style={{ color: 'var(--t2)' }}>{reviewerName(r)}</td>
                    <td style={{ maxWidth: 220, color: 'var(--t2)' }} title={r.notes}>
                      {r.notes.slice(0, 65)}{r.notes.length > 65 ? '…' : ''}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--t3)' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditReview(r)}>Edit</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => setDeleteTarget(r._id)}>Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && <Pagination meta={meta} onPage={setPage} />}
        </>
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Review"
        message="Delete this performance review? This cannot be undone."
        confirmLabel="Delete"
        isDestructive
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  );
}
