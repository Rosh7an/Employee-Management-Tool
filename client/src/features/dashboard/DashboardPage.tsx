import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
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
import api from '../../lib/axios';

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

function LiveDateWidget() {
  const [hovered, setHovered] = useState(false);
  const [tick, setTick] = useState(new Date());

  useEffect(() => {
    if (!hovered) return;
    const id = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(id);
  }, [hovered]);

  const now = new Date();
  const s = tick.getSeconds();
  const m = tick.getMinutes();
  const h = tick.getHours() % 12;
  const secDeg   = s * 6;
  const minDeg   = m * 6 + s * 0.1;
  const hourDeg  = h * 30 + m * 0.5;

  const hand = (deg: number, len: number, width: number, color: string) => {
    const rad = (deg - 90) * (Math.PI / 180);
    const cx = 28, cy = 28;
    return (
      <line
        x1={cx} y1={cy}
        x2={cx + len * Math.cos(rad)}
        y2={cy + len * Math.sin(rad)}
        stroke={color} strokeWidth={width} strokeLinecap="round"
      />
    );
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', cursor: 'default', userSelect: 'none' }}
    >
      {/* Date pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 14px', borderRadius: 99,
        background: 'linear-gradient(135deg, #3f3f46 0%, #09090b 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.18), inset 0 1px 2px rgba(255,255,255,0.12), inset 0 -1px 2px rgba(0,0,0,0.2)',
        transition: 'box-shadow 0.2s',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
          {now.toLocaleDateString('en-US', { weekday: 'short' })}
        </span>
        <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', letterSpacing: '-0.2px' }}>
          {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Clock popover */}
      <div style={{
        position: 'absolute', top: 'calc(100% + 10px)', right: 0,
        pointerEvents: 'none',
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.95)',
        transition: 'opacity 0.2s, transform 0.2s',
        zIndex: 50,
      }}>
        <div style={{
          background: 'linear-gradient(145deg, #1c1c1e 0%, #09090b 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '14px 18px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 12,
          minWidth: 160,
        }}>
          {/* Analog clock SVG */}
          <svg width={56} height={56} viewBox="0 0 56 56">
            {/* Face */}
            <circle cx={28} cy={28} r={26} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />
            <circle cx={28} cy={28} r={24} fill="rgba(255,255,255,0.04)" />
            {/* Hour ticks */}
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i * 30 - 90) * (Math.PI / 180);
              return (
                <line key={i}
                  x1={28 + 20 * Math.cos(a)} y1={28 + 20 * Math.sin(a)}
                  x2={28 + 23 * Math.cos(a)} y2={28 + 23 * Math.sin(a)}
                  stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} strokeLinecap="round"
                />
              );
            })}
            {hand(hourDeg, 12, 2.5, '#ffffff')}
            {hand(minDeg, 16, 2, '#d4d4d8')}
            {hand(secDeg, 19, 1, '#f87171')}
            <circle cx={28} cy={28} r={2} fill="#fff" />
          </svg>
          {/* Digital time */}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
              {tick.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, letterSpacing: '0.5px' }}>
              {tick.toLocaleTimeString('en-US', { second: '2-digit' }).slice(-5)} · local time
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.data),
  });
  const department: string | null = meData?.employee?.department?.name ?? null;

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

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--sp-6)', gap: 'var(--sp-4)' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', color: 'var(--t1)' }}>
            {greeting}, {user?.name?.split(' ')[0]}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {user?.role !== 'employee' && (
              <span style={{ fontSize: 13, color: 'var(--t3)', textTransform: 'capitalize' }}>{user?.role}</span>
            )}
            {department && (
              <span className="badge badge-dept">{department}</span>
            )}
          </div>
        </div>
        <LiveDateWidget />
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
