import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { StatusLabel } from '../../components/StatusLabel';
import { useAuthStore } from '../../store/auth.store';
import { employeesApi, Employee } from './employees.api';
import { departmentsApi, Department } from '../departments/departments.api';
import { EmployeeForm } from './EmployeeForm';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useToast } from '../../hooks/useToast';
import { extractApiError } from '../../lib/axios';

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmTerminate, setConfirmTerminate] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [transferError, setTransferError] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.get(id!).then((r) => r.data.data as Employee),
    enabled: !!id,
  });

  const invalidateAfterEmployeeChange = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ['employees'] });
    qc.invalidateQueries({ queryKey: ['department'] });
    qc.invalidateQueries({ queryKey: ['departments'] });
  };

  const terminateMutation = useMutation({
    mutationFn: () => employeesApi.terminate(id!),
    onSuccess: () => { invalidateAfterEmployeeChange(); toast.success('Employee terminated.'); },
    onError: (e: unknown) => toast.error(extractApiError(e, 'Termination failed.').message),
  });

  const transferMutation = useMutation({
    mutationFn: () => employeesApi.update(id!, { department: selectedDept }),
    onSuccess: () => { setTransferring(false); setTransferError(''); invalidateAfterEmployeeChange(); toast.success('Employee transferred.'); },
    onError: (e: unknown) => setTransferError(extractApiError(e, 'Transfer failed.').message),
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => r.data),
    enabled: transferring,
  });
  const departments: Department[] = deptData?.data?.departments || deptData?.data || [];

  const emp = data;

  if (isLoading) return (
    <div className="loading-page">
      <span className="spinner spinner-dark" />
      <span>Loading employee…</span>
    </div>
  );
  if (error) return <PageWrapper title="Employee"><ErrorBanner error={error} /></PageWrapper>;
  if (!emp) return null;

  if (editing) {
    return (
      <PageWrapper title={emp.name} action={
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
      }>
        <EmployeeForm employee={emp} onSuccess={() => { setEditing(false); invalidateAfterEmployeeChange(); toast.success('Employee updated.'); }} />
      </PageWrapper>
    );
  }

  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const canTransfer = user?.role === 'admin' && emp.status !== 'terminated';
  const canTerminate = user?.role === 'admin' && emp.status !== 'terminated';

  return (
    <>
      <PageWrapper
        title={emp.name}
        action={
          <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
            {canEdit && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Edit</button>}
            {canTransfer && (
              <button className="btn btn-outline btn-sm" onClick={() => { setSelectedDept(emp.department?._id || ''); setTransferring(true); }}>
                Transfer
              </button>
            )}
            {canTerminate && (
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmTerminate(true)}>Terminate</button>
            )}
          </div>
        }
      >
        <div className="detail-section">
          <div className="detail-section-header">
            <h2>Employee Profile</h2>
            <span className="mono">{emp.employeeId}</span>
          </div>
          <div className="detail-grid">
            <div className="detail-field"><label>Status</label><span><StatusLabel status={emp.status} /></span></div>
            <div className="detail-field"><label>Designation</label><span style={{ fontWeight: 500 }}>{emp.designation}</span></div>
            <div className="detail-field"><label>Email</label><span>{emp.email}</span></div>
            <div className="detail-field"><label>Phone</label><span>{emp.phone || '—'}</span></div>
            <div className="detail-field"><label>Department</label><span>{emp.department?.name || '—'}</span></div>
            {emp.managerId && (
              <div className="detail-field"><label>Reports to</label><span>{emp.managerId.name}</span></div>
            )}
            <div className="detail-field"><label>Date of Joining</label><span>{new Date(emp.dateOfJoining).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
            {user?.role === 'admin' && emp.salary?.base != null && (
              <div className="detail-field"><label>Salary</label><span style={{ fontWeight: 600 }}>${emp.salary.base.toLocaleString()} {emp.salary.currency}</span></div>
            )}
          </div>
        </div>
      </PageWrapper>

      <ConfirmationModal
        isOpen={confirmTerminate}
        title="Terminate Employee"
        message={`Are you sure you want to terminate ${emp.name}? This will change their status to terminated and reject all pending leave requests.`}
        confirmLabel="Terminate"
        onConfirm={() => {
          terminateMutation.mutate();
          setConfirmTerminate(false);
        }}
        onCancel={() => setConfirmTerminate(false)}
        isDestructive={true}
      />

      {transferring && (
        <div className="modal-overlay" onClick={() => setTransferring(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2 className="modal-title">Transfer Department</h2>
            <p style={{ color: 'var(--t2)', marginBottom: 'var(--sp-4)', fontSize: 14, lineHeight: 1.5 }}>
              Moving <strong>{emp.name}</strong> from{' '}
              <strong>{emp.department?.name || 'No Department'}</strong> to:
            </p>
            <div className="input-group" style={{ marginBottom: 'var(--sp-2)' }}>
              <label className="input-label">New Department</label>
              <select
                className="input"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="">— Select department —</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id} disabled={d._id === emp.department?._id}>
                    {d.name}{d._id === emp.department?._id ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {transferError && (
              <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 'var(--sp-3)' }}>
                {transferError}
              </p>
            )}
            <div className="modal-actions" style={{ marginTop: 'var(--sp-5)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setTransferring(false)}>
                Cancel
              </button>
              <button
                className="btn btn-sm"
                disabled={!selectedDept || selectedDept === emp.department?._id || transferMutation.isPending}
                onClick={() => transferMutation.mutate()}
              >
                {transferMutation.isPending ? <span className="spinner" /> : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
