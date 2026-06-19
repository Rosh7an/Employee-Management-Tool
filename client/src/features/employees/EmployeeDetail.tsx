import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { StatusLabel } from '../../components/StatusLabel';
import { useAuthStore } from '../../store/auth.store';
import { employeesApi, Employee } from './employees.api';
import { EmployeeForm } from './EmployeeForm';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [confirmTerminate, setConfirmTerminate] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.get(id!).then((r) => r.data.data as Employee),
    enabled: !!id,
  });

  const terminateMutation = useMutation({
    mutationFn: () => employeesApi.terminate(id!),
    onSuccess: () => refetch(),
  });

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
        <EmployeeForm employee={emp} onSuccess={() => { setEditing(false); refetch(); }} />
      </PageWrapper>
    );
  }

  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const canTerminate = user?.role === 'admin' && emp.status !== 'terminated';

  return (
    <>
      <PageWrapper
        title={emp.name}
        action={
          <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/employees')}>← Back</button>
            {canEdit && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Edit</button>}
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
            <div className="detail-field"><label>Reports to</label><span>{emp.managerId?.name || '—'}</span></div>
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
    </>
  );
}
