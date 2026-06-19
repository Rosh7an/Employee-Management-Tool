import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Dot,
} from 'recharts';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { dashboardApi, DashboardStats } from './dashboard.api';
import { milestonesApi, Milestone } from '../milestones/milestones.api';
import { useAuthStore } from '../../store/auth.store';

function StatSkeleton() {
  return (
    <div className="stat-card" style={{ gap: 'var(--sp-3)', display: 'flex', flexDirection: 'column' }}>
      <div className="skeleton" style={{ width: 80, height: 12 }} />
      <div className="skeleton" style={{ width: 48, height: 36 }} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartDot(props: any) {
  const { cx, cy, payload } = props;
  const colors: Record<string, string> = { 'Not Started': '#d1d5db', 'In Progress': '#fbbf24', 'Achieved': '#10b981' };
  return <Dot cx={cx} cy={cy} r={5} fill={colors[payload.name] || '#0f0f0f'} stroke="#fff" strokeWidth={2} />;
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const now = new Date();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats().then((r) => r.data.data as DashboardStats),
  });

  const { data: milestones } = useQuery({
    queryKey: ['milestones'],
    queryFn: () => milestonesApi.list().then((r) => r.data.data as Milestone[]),
  });

  const milestoneChart = milestones
    ? [
        { name: 'Not Started', count: milestones.filter((m) => m.status === 'not-started').length },
        { name: 'In Progress', count: milestones.filter((m) => m.status === 'in-progress').length },
        { name: 'Achieved',    count: milestones.filter((m) => m.status === 'achieved').length },
      ]
    : [];

  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <PageWrapper title="Dashboard">
      {error && <ErrorBanner error={error} />}

      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', color: 'var(--t1)' }}>
          {greeting}, {user?.name?.split(' ')[0]}
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--t3)', marginTop: 4 }}>
          {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {' · '}
          <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
        ) : data ? (
          <>
            <div className="stat-card">
              <div className="stat-card-label">Total Employees</div>
              <div className="stat-card-value">{data.totalEmployees}</div>
              <div className="stat-card-sub">{data.activeEmployees} active</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Pending Leaves</div>
              <div className="stat-card-value">{data.pendingLeaves}</div>
              <div className="stat-card-sub">awaiting review</div>
            </div>
            {(isAdmin || isManager) && (
              <div className="stat-card">
                <div className="stat-card-label">Departments</div>
                <div className="stat-card-value">{data.totalDepartments}</div>
                <div className="stat-card-sub">across the org</div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Milestones section */}
      <div style={{ marginTop: 'var(--sp-6)' }}>
        <div className="section-header">
          <span className="section-title">My Milestones</span>
          <Link to="/milestones" style={{ fontSize: 13, color: 'var(--t3)', textDecoration: 'none', fontWeight: 500 }}>
            View all →
          </Link>
        </div>

        {milestones && milestones.length > 0 ? (
          <>
            <div className="perf-chart-card" style={{ marginBottom: 'var(--sp-4)' }}>
              <div className="perf-chart-header">
                <span className="perf-chart-title">Progress Pipeline</span>
                <span className="perf-chart-avg">
                  <strong>{milestones.filter((m) => m.status === 'achieved').length}</strong> / {milestones.length} achieved
                </span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={milestoneChart} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={24} />
                  <Tooltip
                    formatter={(v) => [v, 'Count']}
                    contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#0f0f0f"
                    strokeWidth={2}
                    dot={<ChartDot />}
                    activeDot={{ r: 7, fill: '#0f0f0f', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Recent milestones as JIRA-style rows */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Status</th><th>Title</th><th>Due</th></tr>
                </thead>
                <tbody>
                  {milestones.slice(0, 5).map((m) => (
                    <tr key={m._id}>
                      <td>
                        <span
                          className="milestone-status"
                          style={{
                            background: m.status === 'achieved' ? '#d1fae5' : m.status === 'in-progress' ? '#fef3c7' : 'var(--s2)',
                            color: m.status === 'achieved' ? '#065f46' : m.status === 'in-progress' ? '#92400e' : 'var(--t3)',
                          }}
                        >
                          {m.status === 'not-started' ? 'Not Started' : m.status === 'in-progress' ? 'In Progress' : 'Achieved'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{m.title}</td>
                      <td style={{ fontSize: 12, color: 'var(--t3)' }}>
                        {new Date(m.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13.5, color: 'var(--t3)', padding: 'var(--sp-4) 0' }}>
            No milestones yet.{' '}
            <Link to="/milestones" style={{ color: 'var(--t1)' }}>Create your first →</Link>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
