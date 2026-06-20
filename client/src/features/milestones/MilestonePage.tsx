import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Dot,
} from 'recharts';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useAuthStore } from '../../store/auth.store';
import { milestonesApi, Milestone } from './milestones.api';
import { useToast } from '../../hooks/useToast';
import { extractApiError } from '../../lib/axios';

const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'achieved': 'Achieved',
};

const STATUS_STYLE: Record<string, { background: string; color: string }> = {
  'not-started': { background: 'var(--s2)', color: 'var(--t3)' },
  'in-progress': { background: '#fef3c7', color: '#92400e' },
  'achieved':    { background: '#d1fae5', color: '#065f46' },
};

interface MilestoneFormState {
  title: string;
  description: string;
  targetDate: string;
  status: 'not-started' | 'in-progress' | 'achieved';
}

const emptyForm: MilestoneFormState = { title: '', description: '', targetDate: '', status: 'not-started' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartDot(props: any) {
  const { cx, cy, payload } = props;
  const fills: Record<string, string> = { 'Not Started': '#d1d5db', 'In Progress': '#fbbf24', 'Achieved': '#10b981' };
  return <Dot cx={cx} cy={cy} r={5} fill={fills[payload.name] || '#0f0f0f'} stroke="#fff" strokeWidth={2} />;
}

export function MilestonePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Milestone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState<MilestoneFormState>(emptyForm);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['milestones'],
    queryFn: () => milestonesApi.list().then((r) => r.data.data as Milestone[]),
  });
  const milestones = data || [];

  const filtered = statusFilter === 'all' ? milestones : milestones.filter((m) => m.status === statusFilter);

  const chartData = [
    { name: 'Not Started', count: milestones.filter((m) => m.status === 'not-started').length },
    { name: 'In Progress', count: milestones.filter((m) => m.status === 'in-progress').length },
    { name: 'Achieved',    count: milestones.filter((m) => m.status === 'achieved').length },
  ];

  const createMutation = useMutation({
    mutationFn: () => milestonesApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones'] });
      setShowForm(false);
      setForm(emptyForm);
      toast.success('Milestone created.');
    },
    onError: (e: unknown) => toast.error(extractApiError(e, 'Failed to create milestone.').message),
  });

  const updateMutation = useMutation({
    mutationFn: () => milestonesApi.update(editTarget!._id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones'] });
      setEditTarget(null);
      setShowForm(false);
      setForm(emptyForm);
      toast.success('Milestone updated.');
    },
    onError: (e: unknown) => toast.error(extractApiError(e, 'Failed to update milestone.').message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => milestonesApi.delete(deleteTarget!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones'] });
      setDeleteTarget(null);
      toast.success('Milestone deleted.');
    },
    onError: (e: unknown) => toast.error(extractApiError(e, 'Failed to delete milestone.').message),
  });

  function openEdit(m: Milestone) {
    setEditTarget(m);
    setForm({ title: m.title, description: m.description || '', targetDate: m.targetDate.slice(0, 10), status: m.status });
    setShowForm(true);
  }

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditTarget(null);
    setForm(emptyForm);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editTarget) updateMutation.mutate();
    else createMutation.mutate();
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isDatePast = !!form.targetDate && form.targetDate < todayStr;

  function creatorId(m: Milestone): string | undefined {
    if (!m.createdBy) return undefined;
    return typeof m.createdBy === 'object' ? m.createdBy._id : m.createdBy;
  }

  function canEdit(m: Milestone) {
    if (isAdmin) return true;
    return creatorId(m) === user?._id;
  }

  function canDelete(m: Milestone) {
    return m.status === 'not-started' && canEdit(m);
  }

  return (
    <PageWrapper
      title="Milestones"
      action={<button className="btn btn-sm btn-ai" onClick={openCreate}>+ New Milestone</button>}
    >
      {error && <ErrorBanner error={error} />}

      {/* Inline form panel */}
      {showForm && (
        <div style={{ marginBottom: 32, padding: '24px' }}>
          <div className="form-section-label">
            {editTarget ? 'Edit Milestone' : 'New Milestone'}
          </div>

          <form onSubmit={handleSubmit} style={{ margin: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24, rowGap: 0, alignItems: 'start' }}>

              {/* Row 1 — field labels */}
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                Title
              </label>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                Target Date
              </label>

              {/* Row 2 — 44px inputs, same top position */}
              <input
                className="input"
                style={{ height: 44 }}
                required
                value={form.title}
                placeholder="e.g. Launch v2.0"
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              <div>
                <input
                  className={`input${isDatePast ? ' has-error' : ''}`}
                  type="date"
                  style={{ height: 44 }}
                  required
                  min={todayStr}
                  value={form.targetDate}
                  onChange={(e) => setForm((p) => ({ ...p, targetDate: e.target.value }))}
                />
                {isDatePast && (
                  <span className="input-error-msg">Target date must be today or in the future.</span>
                )}
              </div>

              {/* Row 3 — second group labels, 20px gap above */}
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginTop: 20, marginBottom: 6 }}>
                Status
              </label>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginTop: 20, marginBottom: 6 }}>
                Description{' '}
                <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
              </label>

              {/* Row 4 — select 44px, textarea 88px; both start at same top Y */}
              <select
                className="input"
                style={{ height: 44 }}
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as MilestoneFormState['status'] }))}
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="achieved">Achieved</option>
              </select>
              <textarea
                className="input"
                style={{ height: 88, resize: 'none' }}
                value={form.description}
                placeholder="What does this milestone aim to achieve and how will success be measured?"
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />

              {/* Row 5 — buttons flush under left column; right cell intentionally empty */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={!form.title || !form.targetDate || isDatePast || isSubmitting}
                  style={{
                    height: 44,
                    padding: '0 16px',
                    background: '#0f0f0f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: (!form.title || !form.targetDate || isDatePast || isSubmitting) ? 'not-allowed' : 'pointer',
                    opacity: (!form.title || !form.targetDate || isDatePast || isSubmitting) ? 0.45 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isSubmitting ? <span className="spinner" /> : editTarget ? 'Save Changes' : '+ Create'}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  style={{
                    height: 44,
                    padding: '0 16px',
                    background: 'transparent',
                    color: '#374151',
                    border: '1px solid #D1D5DB',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* Progress chart */}
      {milestones.length > 0 && (
        <div className="perf-chart-card" style={{ marginBottom: 'var(--sp-5)' }}>
          <div className="perf-chart-header">
            <span className="perf-chart-title">Progress Pipeline</span>
            <span className="perf-chart-avg">
              <strong>{milestones.filter((m) => m.status === 'achieved').length}</strong> of{' '}
              <strong>{milestones.length}</strong> achieved
            </span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
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
      )}

      {/* Filter tabs */}
      {milestones.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
          {(['all', 'not-started', 'in-progress', 'achieved'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '4px 12px', fontSize: 12.5, fontWeight: 500, borderRadius: 4,
                border: '1.5px solid',
                borderColor: statusFilter === s ? 'var(--t1)' : 'var(--s3)',
                background: statusFilter === s ? 'var(--t1)' : 'transparent',
                color: statusFilter === s ? 'var(--s0)' : 'var(--t2)',
                cursor: 'pointer',
              }}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
              {' '}
              <span style={{ opacity: 0.65 }}>
                ({s === 'all' ? milestones.length : milestones.filter((m) => m.status === s).length})
              </span>
            </button>
          ))}
        </div>
      )}

      {isLoading && <div className="loading-page">Loading…</div>}
      {!isLoading && milestones.length === 0 && (
        <EmptyState title="No milestones yet" message="Track your goals — create your first milestone." />
      )}

      {/* JIRA-style issue list */}
      {filtered.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 130 }}>Status</th>
                <th>Title</th>
                <th>Description</th>
                <th>Due Date</th>
                {isAdmin && <th>Created By</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m._id}>
                  <td>
                    <span
                      className="milestone-status"
                      style={STATUS_STYLE[m.status]}
                    >
                      {STATUS_LABELS[m.status]}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, maxWidth: 220 }}>{m.title}</td>
                  <td style={{ color: 'var(--t3)', maxWidth: 260, fontSize: 13 }}>
                    {m.description
                      ? (m.description.length > 60 ? m.description.slice(0, 60) + '…' : m.description)
                      : <span style={{ fontStyle: 'italic', opacity: 0.5 }}>—</span>}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--t2)', whiteSpace: 'nowrap' }}>
                    {new Date(m.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  {isAdmin && (
                    <td style={{ fontSize: 13, color: 'var(--t2)' }}>
                      {m.createdBy && typeof m.createdBy === 'object' ? m.createdBy.name : '—'}
                    </td>
                  )}
                  <td>
                    {canEdit(m) && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)}>Edit</button>
                        {canDelete(m) && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteTarget(m._id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Milestone"
        message="This will permanently delete the milestone. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteTarget(null)}
        isDestructive
      />
    </PageWrapper>
  );
}
