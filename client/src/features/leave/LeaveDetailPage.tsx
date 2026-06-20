import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, CalendarDays, Clock, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { PageWrapper } from '../../layouts/PageWrapper';
import { StatusLabel } from '../../components/StatusLabel';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAuthStore } from '../../store/auth.store';
import { leaveApi } from './leave.api';
import { extractApiError } from '../../lib/axios';
import { useToast } from '../../hooks/useToast';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--t1)', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--s0)',
      border: '1px solid var(--s3)',
      borderRadius: 12,
      padding: '20px 24px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <Icon size={15} strokeWidth={2} color="var(--t3)" />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
    </div>
  );
}

export function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();
  const qc = useQueryClient();

  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['leave', id],
    queryFn: () => leaveApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: () => leaveApi.review(id!, { status: reviewStatus, reviewNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave', id] });
      qc.invalidateQueries({ queryKey: ['leave'] });
      toast.success(`Leave ${reviewStatus}.`);
      setReviewError('');
    },
    onError: (e: unknown) => {
      setReviewError(extractApiError(e, 'Review failed.').message);
    },
  });

  const canReview = (user?.role === 'admin' || user?.role === 'manager') && data?.status === 'pending';

  const emp = data?.employeeId;
  const empName  = typeof emp === 'object' ? emp?.name : '—';
  const empCode  = typeof emp === 'object' ? emp?.employeeId : '—';
  const empEmail = typeof emp === 'object' ? emp?.email : '—';
  const empDesig = typeof emp === 'object' ? emp?.designation : '—';

  const reviewer = data?.reviewedBy;
  const reviewerName = reviewer && typeof reviewer === 'object' ? (reviewer as any).name : null;

  const duration = data
    ? Math.round((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 86_400_000) + 1
    : null;

  return (
    <PageWrapper
      title="Leave Request"
      action={
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </button>
      }
    >
      {error && <ErrorBanner error={error} />}
      {isLoading && <div className="loading-page"><span className="spinner spinner-dark" /></div>}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>

          {/* Status banner */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderRadius: 10,
            background: data.status === 'approved' ? '#f0fdf4' : data.status === 'rejected' ? '#fef2f2' : '#fefce8',
            border: `1px solid ${data.status === 'approved' ? '#bbf7d0' : data.status === 'rejected' ? '#fecaca' : '#fde68a'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {data.status === 'approved' && <CheckCircle size={18} color="#16a34a" />}
              {data.status === 'rejected' && <XCircle size={18} color="#dc2626" />}
              {data.status === 'pending'  && <AlertCircle size={18} color="#d97706" />}
              <span style={{ fontWeight: 600, fontSize: 14, color: data.status === 'approved' ? '#166534' : data.status === 'rejected' ? '#991b1b' : '#92400e', textTransform: 'capitalize' }}>
                {data.status}
              </span>
              {data.reviewedAt && (
                <span style={{ fontSize: 12, color: 'var(--t3)', marginLeft: 4 }}>
                  · reviewed {new Date(data.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
            <StatusLabel status={data.status} />
          </div>

          {/* Employee info */}
          {user?.role !== 'employee' && (
            <Card>
              <SectionTitle icon={User} label="Employee" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px 24px' }}>
                <Field label="Name" value={empName} />
                <Field label="Employee ID" value={empCode} />
                <Field label="Designation" value={empDesig} />
                <Field label="Email" value={empEmail} />
              </div>
            </Card>
          )}

          {/* Leave details */}
          <Card>
            <SectionTitle icon={CalendarDays} label="Leave Details" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px 24px' }}>
              <Field label="Type" value={<span style={{ textTransform: 'capitalize' }}>{data.type}</span>} />
              <Field label="From" value={new Date(data.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} />
              <Field label="To" value={new Date(data.endDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} />
              <Field label="Duration" value={`${duration} day${duration !== 1 ? 's' : ''}`} />
            </div>
            {data.reason && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--s3)' }}>
                <SectionTitle icon={FileText} label="Reason" />
                <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{data.reason}</p>
              </div>
            )}
          </Card>

          {/* Review info */}
          {(data.status !== 'pending' || reviewerName) && (
            <Card>
              <SectionTitle icon={Clock} label="Review" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px 24px' }}>
                <Field label="Reviewed By" value={reviewerName} />
                <Field label="Reviewed On" value={data.reviewedAt ? new Date(data.reviewedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
                {data.reviewNote && <Field label="Note" value={data.reviewNote} />}
              </div>
            </Card>
          )}

          {/* Review action */}
          {canReview && (
            <Card>
              <SectionTitle icon={CheckCircle} label="Submit Review" />
              {reviewError && <ErrorBanner error={null} message={reviewError} />}
              <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="input-group" style={{ flex: '0 0 auto' }}>
                  <label className="input-label">Decision</label>
                  <select
                    className="input"
                    style={{ width: 140 }}
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as 'approved' | 'rejected')}
                  >
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
                  <label className="input-label">Note (optional)</label>
                  <input
                    className="input"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Add a note…"
                  />
                </div>
                <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                  <button
                    className={`btn btn-sm ${reviewStatus === 'rejected' ? 'btn-danger' : ''}`}
                    onClick={() => reviewMutation.mutate()}
                    disabled={reviewMutation.isPending}
                  >
                    {reviewMutation.isPending ? <span className="spinner" /> : 'Submit'}
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Submitted on */}
          <p style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'right' }}>
            Submitted {new Date(data.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      )}
    </PageWrapper>
  );
}
