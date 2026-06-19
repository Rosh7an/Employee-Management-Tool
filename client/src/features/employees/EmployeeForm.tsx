import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ErrorBanner } from '../../components/ErrorBanner';
import { employeesApi, Employee, CreateEmployeeInput } from './employees.api';
import { departmentsApi, Department } from '../departments/departments.api';
import { extractApiError } from '../../lib/axios';

interface Props {
  employee?: Employee;
  onSuccess: () => void;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  managerId: string;
  salary: { base: number; currency: string };
  dateOfJoining: string;
  status: 'active' | 'on-leave' | 'terminated';
  employmentType: 'full-time' | 'part-time' | 'contract';
}

export function EmployeeForm({ employee, onSuccess }: Props) {
  const isEdit = !!employee;

  const initialForm: FormState = {
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    designation: employee?.designation || '',
    department: (employee?.department && typeof employee.department === 'object')
      ? employee.department._id
      : '',
    managerId: (employee?.managerId && typeof employee.managerId === 'object')
      ? employee.managerId._id
      : '',
    salary: employee?.salary ?? { base: 0, currency: 'USD' },
    dateOfJoining: employee?.dateOfJoining ? employee.dateOfJoining.slice(0, 10) : new Date().toISOString().slice(0, 10),
    status: employee?.status || 'active',
    employmentType: employee?.employmentType || 'full-time',
  };

  const [form, setForm] = useState<FormState>(() => {
    const saved = sessionStorage.getItem('pending_form');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        sessionStorage.removeItem('pending_form');
        return { ...initialForm, ...parsed, salary: parsed.salary ? JSON.parse(parsed.salary) : initialForm.salary };
      } catch { /* ignore */ }
    }
    return initialForm;
  });
  const [initialSnapshot] = useState(() => JSON.stringify(initialForm));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => r.data),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ limit: 200 }).then((r) => r.data),
  });

  const departments: Department[] = deptData?.data?.departments || deptData?.data || [];
  const allEmployees: Employee[] = empData?.data?.data || empData?.data || [];
  const managerOptions = allEmployees.filter((e) => e._id !== employee?._id && e.status !== 'terminated');

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Partial<CreateEmployeeInput> & { status?: string } = {
        ...form,
        managerId: form.managerId || undefined,
      };
      if (isEdit) {
        return employeesApi.update(employee._id, payload);
      }
      return employeesApi.create(payload as CreateEmployeeInput);
    },
    onSuccess,
    onError: (err: unknown) => {
      const { message, field } = extractApiError(err, 'Save failed.');
      if (field) setFieldErrors((p) => ({ ...p, [field]: message }));
      else setError(message);
    },
  });

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev: Record<string, string>) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  const errors: Record<string, string> = {};
  if (!form.name || form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!form.designation || form.designation.trim().length < 1) {
    errors.designation = 'Designation is required.';
  }
  if (!form.department) {
    errors.department = 'Department is required.';
  }
  if (!form.salary?.base || form.salary.base <= 0) {
    errors.salary = 'Salary must be greater than 0.';
  }
  if (!form.dateOfJoining) {
    errors.dateOfJoining = 'Date of joining is required.';
  }

  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(form) !== initialSnapshot;

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!isValid) {
      setTouched({ name: true, email: true, designation: true, department: true, salary: true, dateOfJoining: true });
      return;
    }
    if (isDirty) {
      mutation.mutate();
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <ErrorBanner error={null} message={error} />}

      <div className="form-row">
        <div className="input-group">
          <label className="input-label">Name</label>
          <input
            className={`input ${touched.name && errors.name ? 'has-error' : ''}`}
            name="name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            required
          />
          {touched.name && errors.name && <span className="input-error-msg">{errors.name}</span>}
          {fieldErrors.name && <span className="input-error-msg">{fieldErrors.name}</span>}
        </div>
        <div className="input-group">
          <label className="input-label">Email</label>
          <input
            className={`input ${touched.email && errors.email ? 'has-error' : ''}`}
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            required
            disabled={isEdit}
          />
          {touched.email && errors.email && <span className="input-error-msg">{errors.email}</span>}
          {fieldErrors.email && <span className="input-error-msg">{fieldErrors.email}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="input-group">
          <label className="input-label">Designation</label>
          <input
            className={`input ${touched.designation && errors.designation ? 'has-error' : ''}`}
            name="designation"
            value={form.designation}
            onChange={(e) => set('designation', e.target.value)}
            onBlur={() => handleBlur('designation')}
            required
          />
          {touched.designation && errors.designation && <span className="input-error-msg">{errors.designation}</span>}
        </div>
        <div className="input-group">
          <label className="input-label">Phone <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(optional)</span></label>
          <input
            className="input"
            name="phone"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="input-group">
          <label className="input-label">Department</label>
          <select
            className={`input ${touched.department && errors.department ? 'has-error' : ''}`}
            name="department"
            value={form.department}
            onChange={(e) => set('department', e.target.value)}
            onBlur={() => handleBlur('department')}
          >
            <option value="">— Select department —</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          {touched.department && errors.department && <span className="input-error-msg">{errors.department}</span>}
        </div>
        <div className="input-group">
          <label className="input-label">Manager</label>
          <select
            className="input"
            name="managerId"
            value={form.managerId}
            onChange={(e) => set('managerId', e.target.value)}
          >
            <option value="">— None —</option>
            {managerOptions.map((e) => (
              <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="input-group">
          <label className="input-label">Salary (USD)</label>
          <input
            className={`input ${touched.salary && errors.salary ? 'has-error' : ''}`}
            name="salary"
            type="number"
            min="1"
            value={form.salary?.base || ''}
            onChange={(e) => set('salary', { base: Number(e.target.value), currency: 'USD' })}
            onBlur={() => handleBlur('salary')}
            required
          />
          {touched.salary && errors.salary && <span className="input-error-msg">{errors.salary}</span>}
        </div>
        <div className="input-group">
          <label className="input-label">Employment Type</label>
          <select
            className="input"
            name="employmentType"
            value={form.employmentType}
            onChange={(e) => set('employmentType', e.target.value)}
          >
            <option value="full-time">Full Time</option>
            <option value="part-time">Part Time</option>
            <option value="contract">Contract</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="input-group">
          <label className="input-label">Date of Joining</label>
          <input
            className={`input ${touched.dateOfJoining && errors.dateOfJoining ? 'has-error' : ''}`}
            name="dateOfJoining"
            type="date"
            value={form.dateOfJoining}
            onChange={(e) => set('dateOfJoining', e.target.value)}
            onBlur={() => handleBlur('dateOfJoining')}
            required
          />
          {touched.dateOfJoining && errors.dateOfJoining && <span className="input-error-msg">{errors.dateOfJoining}</span>}
        </div>
        {isEdit && (
          <div className="input-group">
            <label className="input-label">Status</label>
            <select
              className="input"
              name="status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              <option value="active">Active</option>
              <option value="on-leave">On Leave</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 'var(--sp-2)' }}>
        <button
          className="form-btn"
          type="submit"
          disabled={!isDirty || !isValid || mutation.isPending}
        >
          {mutation.isPending ? <span className="spinner" /> : isEdit ? 'Save Changes' : 'Create Employee'}
        </button>
      </div>
    </form>
  );
}
