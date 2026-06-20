import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { useAuthStore } from '../../store/auth.store';
import { departmentsApi, Department } from './departments.api';
import { employeesApi, Employee } from '../employees/employees.api';
import { extractApiError } from '../../lib/axios';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useToast } from '../../hooks/useToast';

interface DeptForm {
  name: string;
  description: string;
  managerId: string;
}

const emptyForm: DeptForm = { name: '', description: '', managerId: '' };

export function DepartmentList() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState<DeptForm>(emptyForm);
  const [formTouched, setFormTouched] = useState<Record<string, boolean>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DeptForm>(emptyForm);
  const [editTouched, setEditTouched] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => r.data),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ limit: 200 }).then((r) => r.data),
    enabled: isAdmin,
  });

  const departments: Department[] = data?.data?.departments || data?.data || [];
  const activeEmployees: Employee[] = (empData?.data?.data || empData?.data || []).filter(
    (e: Employee) => e.status !== 'terminated'
  );

  function validateForm(f: DeptForm): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = 'Department name is required.';
    if (!f.description.trim()) errs.description = 'Description is required.';
    if (!f.managerId) errs.managerId = 'Manager is required.';
    return errs;
  }

  const createMutation = useMutation({
    mutationFn: () =>
      departmentsApi.create({
        name: form.name,
        description: form.description || undefined,
        managerId: form.managerId || null,
      }),
    onSuccess: () => {
      setForm(emptyForm); setFormTouched({}); setError('');
      refetch();
      qc.invalidateQueries({ queryKey: ['departments'] });
      qc.invalidateQueries({ queryKey: ['department'] });
      toast.success('Department created.');
    },
    onError: (e: unknown) => setError(extractApiError(e, 'Create failed.').message),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      departmentsApi.update(editId!, {
        name: editForm.name,
        description: editForm.description || undefined,
        managerId: editForm.managerId || null,
      }),
    onSuccess: () => {
      setEditId(null); setEditTouched({});
      refetch();
      qc.invalidateQueries({ queryKey: ['departments'] });
      qc.invalidateQueries({ queryKey: ['department'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee'] });
      toast.success('Department updated.');
    },
    onError: (e: unknown) => setError(extractApiError(e, 'Update failed.').message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentsApi.remove(id),
    onSuccess: () => {
      setDeleteTarget(null);
      refetch();
      qc.invalidateQueries({ queryKey: ['departments'] });
      qc.invalidateQueries({ queryKey: ['department'] });
      toast.success('Department deleted.');
    },
    onError: (e: unknown) => setError(extractApiError(e, 'Delete failed.').message),
  });

  function startEdit(dept: Department) {
    setEditId(dept._id);
    setEditForm({
      name: dept.name,
      description: dept.description || '',
      managerId: dept.managerId?._id || '',
    });
    setEditTouched({});
  }

  function handleCreate() {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setFormTouched({ name: true, description: true, managerId: true });
      return;
    }
    createMutation.mutate();
  }

  function handleEdit() {
    const errs = validateForm(editForm);
    if (Object.keys(errs).length > 0) {
      setEditTouched({ name: true, description: true, managerId: true });
      return;
    }
    editMutation.mutate();
  }

  const createErrors = validateForm(form);
  const editErrors = validateForm(editForm);
  const targetDept = departments.find((d) => d._id === deleteTarget);

  return (
    <>
      <PageWrapper title="Departments">
        {error && <ErrorBanner error={null} message={error} />}

        {isAdmin && (
          <div style={{ marginBottom: 24, padding: 24 }}>
            <div className="form-section-label">New Department</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', columnGap: 16, rowGap: 0, alignItems: 'start' }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Name</label>
                <input
                  className={`input ${formTouched.name && createErrors.name ? 'has-error' : ''}`}
                  style={{ height: 44 }}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  onBlur={() => setFormTouched((p) => ({ ...p, name: true }))}
                  placeholder="e.g. Engineering"
                />
                {formTouched.name && createErrors.name && <span className="input-error-msg">{createErrors.name}</span>}
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Description
                </label>
                <input
                  className={`input ${formTouched.description && createErrors.description ? 'has-error' : ''}`}
                  style={{ height: 44 }}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  onBlur={() => setFormTouched((p) => ({ ...p, description: true }))}
                  placeholder="e.g. Responsible for building and shipping all customer-facing products"
                />
                {formTouched.description && createErrors.description && <span className="input-error-msg">{createErrors.description}</span>}
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Manager</label>
                <select
                  className="input"
                  style={{ height: 44 }}
                  value={form.managerId}
                  onChange={(e) => setForm((p) => ({ ...p, managerId: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {activeEmployees.map((e) => (
                    <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ marginBottom: 6, visibility: 'hidden', fontSize: 13 }}>_</div>
                <button
                  className="form-btn"
                  style={{ height: 44, margin: 0 }}
                  onClick={handleCreate}
                  disabled={createMutation.isPending || Object.keys(createErrors).length > 0}
                >
                  {createMutation.isPending ? <span className="spinner" /> : '+ Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading && <div className="loading-page">Loading...</div>}

        {!isLoading && departments.length === 0 && (
          <EmptyState message="No departments yet." />
        )}

        {departments.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Manager</th>
                  <th>Headcount</th>
                  {isAdmin && <th>Actions</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept._id}>
                    <td>
                      {editId === dept._id ? (
                        <div>
                          <input
                            className={`input ${editTouched.name && editErrors.name ? 'has-error' : ''}`}
                            value={editForm.name}
                            style={{ width: 160 }}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                            onBlur={() => setEditTouched((p) => ({ ...p, name: true }))}
                          />
                          {editTouched.name && editErrors.name && <span className="input-error-msg">{editErrors.name}</span>}
                        </div>
                      ) : (
                        <strong>{dept.name}</strong>
                      )}
                    </td>
                    <td>
                      {editId === dept._id ? (
                        <div>
                          <input
                            className={`input ${editTouched.description && editErrors.description ? 'has-error' : ''}`}
                            value={editForm.description}
                            style={{ width: 200 }}
                            placeholder="e.g. Responsible for building and shipping all customer-facing products"
                            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                            onBlur={() => setEditTouched((p) => ({ ...p, description: true }))}
                          />
                          {editTouched.description && editErrors.description && <span className="input-error-msg">{editErrors.description}</span>}
                        </div>
                      ) : (
                        dept.description || '—'
                      )}
                    </td>
                    <td>
                      {editId === dept._id ? (
                        <select
                          className="input"
                          style={{ width: 200 }}
                          value={editForm.managerId}
                          onChange={(e) => setEditForm((p) => ({ ...p, managerId: e.target.value }))}
                        >
                          <option value="">— None —</option>
                          {activeEmployees.map((e) => (
                            <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>
                          ))}
                        </select>
                      ) : (
                        dept.managerId?.name || '—'
                      )}
                    </td>
                    <td>{dept.headcount ?? '—'}</td>
                    {isAdmin && (
                      <td>
                        {editId === dept._id ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-sm" onClick={handleEdit} disabled={editMutation.isPending}>Save</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(dept)}>Edit</button>
                            {(dept.headcount ?? 0) === 0 && (
                              <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(dept._id)}>Delete</button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                    <td style={{ textAlign: 'right' }}>
                      {editId !== dept._id && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 6px', lineHeight: 1 }}
                          title={`View ${dept.name} details`}
                          onClick={() => navigate(`/departments/${dept._id}`)}
                        >
                          <ArrowUpRight size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageWrapper>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Department"
        message={`Delete the "${targetDept?.name || ''}" department? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
        isDestructive={true}
      />
    </>
  );
}
