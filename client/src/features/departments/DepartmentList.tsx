import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { useAuthStore } from '../../store/auth.store';
import { departmentsApi, Department } from './departments.api';
import { extractApiError } from '../../lib/axios';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export function DepartmentList() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => r.data),
  });

  const departments: Department[] = data?.data?.departments || data?.data || [];

  const createMutation = useMutation({
    mutationFn: () => departmentsApi.create({ name: form.name, description: form.description }),
    onSuccess: () => { setForm({ name: '', description: '' }); refetch(); setError(''); },
    onError: (e: unknown) => setError(extractApiError(e, 'Create failed.').message),
  });

  const editMutation = useMutation({
    mutationFn: () => departmentsApi.update(editId!, { name: editForm.name, description: editForm.description }),
    onSuccess: () => { setEditId(null); refetch(); },
    onError: (e: unknown) => setError(extractApiError(e, 'Update failed.').message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentsApi.remove(id),
    onSuccess: () => { setDeleteTarget(null); refetch(); qc.invalidateQueries({ queryKey: ['departments'] }); },
    onError: (e: unknown) => setError(extractApiError(e, 'Delete failed.').message),
  });

  function startEdit(dept: Department) {
    setEditId(dept._id);
    setEditForm({ name: dept.name, description: dept.description || '' });
  }

  const targetDept = departments.find((d) => d._id === deleteTarget);

  return (
    <>
      <PageWrapper title="Departments">
        {error && <ErrorBanner error={null} message={error} />}

        {isAdmin && (
          <div style={{ marginBottom: 24, padding: 24 }}>
            <div className="form-section-label">New Department</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24, rowGap: 0, alignItems: 'start', marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Name</label>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Description</label>
              <input
                className="input"
                style={{ height: 44 }}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Engineering"
              />
              <input
                className="input"
                style={{ height: 44 }}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <button className="form-btn" onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}>
              {createMutation.isPending ? <span className="spinner" /> : '+ Add'}
            </button>
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
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept._id}>
                    <td>
                      {editId === dept._id ? (
                        <input className="input" value={editForm.name} style={{ width: 160 }} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                      ) : (
                        <strong>{dept.name}</strong>
                      )}
                    </td>
                    <td>
                      {editId === dept._id ? (
                        <input className="input" value={editForm.description} style={{ width: 200 }} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
                      ) : (
                        dept.description || '—'
                      )}
                    </td>
                    <td>{dept.managerId?.name || '—'}</td>
                    <td>{dept.headcount ?? '—'}</td>
                    {isAdmin && (
                      <td>
                        {editId === dept._id ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-sm" onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>Save</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(dept)}>Edit</button>
                            {(dept.headcount ?? 0) === 0 ? (
                              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(dept._id)}>Delete</button>
                            ) : (
                              <span style={{ fontSize: 11.5, color: 'var(--t3)', fontStyle: 'italic' }}>
                                {dept.headcount} employee{dept.headcount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    )}
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
