import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../../layouts/PageWrapper';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { Pagination } from '../../components/Pagination';
import { StatusLabel } from '../../components/StatusLabel';
import { useAuthStore } from '../../store/auth.store';
import { employeesApi, Employee } from './employees.api';
import { EmployeeForm } from './EmployeeForm';

export function EmployeeList() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employees', page, search, statusFilter],
    queryFn: () =>
      employeesApi.list({ page, limit: 15, search: search || undefined, status: statusFilter || undefined })
        .then((r) => r.data),
  });

  const employees: Employee[] = data?.data?.employees || data?.data || [];
  const meta = data?.meta;

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  if (showForm) {
    return (
      <PageWrapper title="Add Employee" action={
        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
      }>
        <EmployeeForm onSuccess={() => { setShowForm(false); refetch(); }} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Employees">
      {error && <ErrorBanner error={error} />}

      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={{ display: 'flex', gap: 'var(--sp-2)', minWidth: 280, alignItems: 'stretch' }}>
            <input
              className="input"
              style={{ maxWidth: 280 }}
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="btn btn-ghost btn-sm" type="submit" style={{ alignSelf: 'stretch', height: 'auto' }}>Search</button>
            {search && (
              <button className="btn btn-ghost btn-sm" type="button" style={{ alignSelf: 'stretch', height: 'auto' }}
                onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
                Clear
              </button>
            )}
          </form>
          <select
            className="input"
            style={{ width: 160 }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="on-leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-sm" onClick={() => setShowForm(true)}>+ Add Employee</button>
        )}
      </div>

      {isLoading && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Position</th><th>Department</th><th>Status</th><th>Hire Date</th></tr></thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 14, width: j === 1 ? 120 : 80 }} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && employees.length === 0 && (
        <EmptyState
          title="No employees found"
          message={search ? `No results for "${search}"` : 'Add your first employee to get started.'}
          action={user?.role === 'admin' ? (
            <button className="btn btn-sm" onClick={() => setShowForm(true)}>+ Add Employee</button>
          ) : undefined}
        />
      )}

      {employees.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Status</th>
                  {user?.role === 'admin' && <th>Salary</th>}
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id} className="clickable" onClick={() => navigate(`/employees/${emp._id}`)}>
                    <td><span className="mono">{emp.employeeId}</span></td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{emp.name}</span>
                    </td>
                    <td style={{ color: 'var(--t2)' }}>{emp.designation}</td>
                    <td style={{ color: 'var(--t2)' }}>{emp.department?.name || '—'}</td>
                    <td><StatusLabel status={emp.status} /></td>
                    {user?.role === 'admin' && (
                      <td style={{ fontWeight: 500 }}>
                        {emp.salary?.base != null ? `$${emp.salary.base.toLocaleString()}` : '—'}
                      </td>
                    )}
                    <td style={{ color: 'var(--t3)' }}>{new Date(emp.dateOfJoining).toLocaleDateString()}</td>
                  </tr>
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
