import { useState, Fragment } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { Pagination } from '../../components/Pagination';
import { StatusLabel } from '../../components/StatusLabel';
import { useAuthStore } from '../../store/auth.store';
import { leaveApi, LeaveRequest } from './leave.api';
import { LeaveForm } from './LeaveForm';
import { useToast } from '../../hooks/useToast';
import { extractApiError } from '../../lib/axios';

export function LeaveManagement() {
  const { user } = useAuthStore();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leave', page, statusFilter],
    queryFn: () => leaveApi.list({ page, status: statusFilter || undefined }).then((r) => r.data),
  });

  const leaves: LeaveRequest[] = data?.data?.leaves || data?.data || [];
  const meta = data?.meta;

  const reviewMutation = useMutation({
    mutationFn: () => leaveApi.review(reviewId!, { status: reviewStatus, reviewNote }),
    onSuccess: () => {
      setReviewId(null);
      setReviewNote('');
      refetch();
      toast.success(`Leave ${reviewStatus}.`);
    },
    onError: (e: unknown) => {
      setError(extractApiError(e, 'Review failed.').message);
    },
  });

  const canReview = user?.role === 'admin' || user?.role === 'manager';
  const isDirector = user?.isDirector === true;
  const isAdmin = user?.role === 'admin';

  if (showForm) {
    return (
      <PageWrapper title="Request Leave" action={
        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
      }>
        <LeaveForm onSuccess={() => { setShowForm(false); refetch(); toast.success('Leave request submitted.'); }} />
      </PageWrapper>
    );
  }

  function employeeName(leave: LeaveRequest) {
    if (typeof leave.employeeId === 'object') return leave.employeeId.name;
    return '—';
  }

  function reviewerName(leave: LeaveRequest) {
    if (leave.reviewedBy && typeof leave.reviewedBy === 'object') return (leave.reviewedBy as { name: string }).name;
    return null;
  }

  return (
    <PageWrapper title="Leave">
      {error && <ErrorBanner error={null} message={error} />}

      <div className="filter-bar" style={{ justifyContent: 'space-between' }}>
        <select
          className="input"
          style={{ width: 180 }}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        {!isDirector && (
          <button className="btn btn-sm" onClick={() => setShowForm(true)}>+ Request Leave</button>
        )}
      </div>

      {isDirector && (
        <div style={{ fontSize: 13, color: 'var(--t3)', padding: 'var(--sp-2) 0', marginBottom: 'var(--sp-2)' }}>
          Company director is exempt from the leave system.
        </div>
      )}

      {isLoading && <div className="loading-page"><span className="spinner spinner-dark" /></div>}
      {!isLoading && leaves.length === 0 && (
        <EmptyState title="No leave requests" message="Submit a new leave request to get started." />
      )}

      {leaves.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {user?.role !== 'employee' && <th>Employee</th>}
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Status</th>
                  {isAdmin && <th>Reviewed By</th>}
                  {canReview && <th></th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <Fragment key={leave._id}>
                    <tr>
                      {user?.role !== 'employee' && (
                        <td><span style={{ fontWeight: 500 }}>{employeeName(leave)}</span></td>
                      )}
                      <td style={{ textTransform: 'capitalize', color: 'var(--t2)' }}>{leave.type}</td>
                      <td style={{ color: 'var(--t2)' }}>{new Date(leave.startDate).toLocaleDateString()}</td>
                      <td style={{ color: 'var(--t2)' }}>{new Date(leave.endDate).toLocaleDateString()}</td>
                      <td style={{ color: 'var(--t3)' }} title={leave.reason}>
                        {leave.reason ? leave.reason.slice(0, 48) + (leave.reason.length > 48 ? '…' : '') : '—'}
                      </td>
                      <td><StatusLabel status={leave.status} /></td>
                      {isAdmin && (
                        <td style={{ fontSize: 12, color: 'var(--t3)' }}>
                          {reviewerName(leave)
                            ? <>
                                <span style={{ fontWeight: 500, color: 'var(--t2)' }}>{reviewerName(leave)}</span>
                                {leave.reviewedAt && (
                                  <div style={{ fontSize: 11 }}>
                                    {new Date(leave.reviewedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </>
                            : '—'}
                        </td>
                      )}
                      {canReview && (
                        <td>
                          {leave.status === 'pending' && (
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={() => { setReviewId(leave._id); setReviewStatus('approved'); setReviewNote(''); }}
                            >
                              Review
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    {reviewId === leave._id && (
                      <tr>
                        <td colSpan={10} style={{ padding: 0, background: 'var(--s1)' }}>
                          <div style={{
                            display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-end', flexWrap: 'wrap',
                            padding: 'var(--sp-4) var(--sp-5)',
                            borderTop: '1px solid var(--s3)', borderBottom: '1px solid var(--s3)',
                          }}>
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
                            <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-end' }}>
                              <button
                                className="btn btn-sm"
                                onClick={() => reviewMutation.mutate()}
                                disabled={reviewMutation.isPending}
                              >
                                {reviewMutation.isPending ? <span className="spinner" /> : 'Submit review'}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setReviewId(null)}>Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {meta && <Pagination meta={meta} onPage={setPage} />}
        </>
      )}
    </PageWrapper>
  );
}
