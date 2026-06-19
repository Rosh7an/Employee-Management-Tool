import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { StatusLabel } from '../../components/StatusLabel';
import { useAuthStore } from '../../store/auth.store';
import api from '../../lib/axios';
import { performanceApi, PerformanceReview } from '../performance/performance.api';

interface MeResponse {
  user: { _id: string; name: string; email: string; role: string };
  employee: {
    _id: string;
    employeeId: string;
    name: string;
    email: string;
    phone?: string;
    designation: string;
    status: string;
    employmentType: string;
    dateOfJoining: string;
    department?: { _id: string; name: string } | null;
    managerId?: { _id: string; name: string; employeeId: string } | null;
    salary?: { base: number; currency: string };
  } | null;
}

function periodToSort(p: string) {
  const m = p.match(/Q(\d)\s+(\d{4})/);
  if (!m) return 0;
  return parseInt(m[2]) * 10 + parseInt(m[1]);
}

function abbreviatePeriod(p: string) {
  return p.replace(/(\d{4})/, (y) => `'${y.slice(2)}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>{label}</div>
      <div style={{ fontSize: 13 }}>Rating: <strong>{payload[0].value}/5</strong></div>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: meData, isLoading, error } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.data as MeResponse),
  });

  const emp = meData?.employee;

  const { data: perfData } = useQuery({
    queryKey: ['my-performance'],
    queryFn: () => performanceApi.list({ page: 1 }).then((r) => r.data),
    enabled: !!meData,
  });
  const allReviews: PerformanceReview[] = perfData?.data || [];
  const sortedReviews = [...allReviews].sort((a, b) => periodToSort(a.period) - periodToSort(b.period));
  const chartPoints = sortedReviews.map((r) => ({
    period: abbreviatePeriod(r.period),
    rating: r.rating,
  }));
  const avg = chartPoints.length
    ? (chartPoints.reduce((s, p) => s + p.rating, 0) / chartPoints.length).toFixed(1)
    : null;

  if (isLoading) {
    return <div className="loading-page"><span className="spinner spinner-dark" /><span>Loading profile…</span></div>;
  }
  if (error) return <PageWrapper title="Profile"><ErrorBanner error={error} /></PageWrapper>;

  const roleLabel: Record<string, string> = { admin: 'Admin', manager: 'Manager', employee: 'Employee' };

  return (
    <PageWrapper
      title="My Profile"
      action={
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
      }
    >
      <div className="detail-section">
        <div className="detail-section-header">
          <div>
            <h2>{user?.name}</h2>
            {emp && <span className="mono" style={{ fontSize: 12 }}>{emp.employeeId}</span>}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
            padding: '3px 8px', borderRadius: 4, background: 'var(--s2)', color: 'var(--t2)',
          }}>
            {roleLabel[user?.role ?? ''] ?? user?.role}
          </span>
        </div>

        <div className="detail-grid">
          <div className="detail-field"><label>Email</label><span>{user?.email}</span></div>
          {emp && <>
            <div className="detail-field"><label>Status</label><span><StatusLabel status={emp.status as 'active' | 'on-leave' | 'terminated'} /></span></div>
            <div className="detail-field"><label>Designation</label><span style={{ fontWeight: 500 }}>{emp.designation}</span></div>
            <div className="detail-field"><label>Department</label><span>{emp.department?.name || '—'}</span></div>
            <div className="detail-field"><label>Reports to</label><span>{emp.managerId?.name || '—'}</span></div>
            <div className="detail-field"><label>Employment Type</label><span style={{ textTransform: 'capitalize' }}>{emp.employmentType}</span></div>
            <div className="detail-field"><label>Date of Joining</label><span>{new Date(emp.dateOfJoining).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
            {emp.phone && <div className="detail-field"><label>Phone</label><span>{emp.phone}</span></div>}
            {(user?.role === 'admin') && emp.salary?.base != null && (
              <div className="detail-field">
                <label>Salary</label>
                <span style={{ fontWeight: 600 }}>${emp.salary.base.toLocaleString()} {emp.salary.currency}</span>
              </div>
            )}
          </>}
        </div>
      </div>

      {/* Performance growth chart */}
      {chartPoints.length >= 2 && (
        <div className="perf-chart-card" style={{ marginTop: 'var(--sp-5)' }}>
          <div className="perf-chart-header">
            <span className="perf-chart-title">My Performance Growth</span>
            <span className="perf-chart-avg">
              Avg <strong>{avg}</strong> / 5 over {chartPoints.length} quarters
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartPoints} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={24} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="rating" stroke="#0f0f0f" strokeWidth={2}
                dot={{ r: 4, fill: '#0f0f0f', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#0f0f0f' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent reviews */}
      {sortedReviews.length > 0 && (
        <div className="detail-section" style={{ marginTop: 'var(--sp-5)' }}>
          <div className="detail-section-header"><h2>Performance Reviews</h2></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Period</th><th>Rating</th><th>Reviewer</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {[...sortedReviews].reverse().map((r) => (
                  <tr key={r._id}>
                    <td><span className="mono">{r.period}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', gap: 2 }}>
                        {[1,2,3,4,5].map((n) => (
                          <span key={n} style={{ fontSize: 13, color: n <= r.rating ? '#f59e0b' : '#d1d5db' }}>★</span>
                        ))}
                        <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>{r.rating}/5</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--t2)' }}>
                      {r.reviewerId && typeof r.reviewerId === 'object' ? r.reviewerId.name : '—'}
                    </td>
                    <td style={{ maxWidth: 240, color: 'var(--t2)' }} title={r.notes}>
                      {r.notes.slice(0, 70)}{r.notes.length > 70 ? '…' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
