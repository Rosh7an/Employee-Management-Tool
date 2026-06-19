import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ErrorBanner } from '../../components/ErrorBanner';
import { performanceApi, PerformanceReview, PerformanceQuarter } from './performance.api';
import { employeesApi, Employee } from '../employees/employees.api';
import { useAuthStore } from '../../store/auth.store';
import { extractApiError } from '../../lib/axios';

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

interface Props {
  review?: PerformanceReview;
  openQuarters?: PerformanceQuarter[];
  onSuccess: () => void;
}

export function PerformanceForm({ review, openQuarters = [], onSuccess }: Props) {
  const { user } = useAuthStore();
  const isEdit = !!review;

  const currentQuarterStr = getCurrentQuarter();

  // Filter allowed quarters for HR/Admin to current quarter only
  const allowedQuarters = useMemo(() => {
    const isHrOrAdmin = user?.role === 'admin';
    if (!isHrOrAdmin) return openQuarters;
    return openQuarters.filter((q) => q.period === currentQuarterStr);
  }, [openQuarters, user?.role, currentQuarterStr]);

  const defaultPeriod = review?.period || (allowedQuarters[0]?.period ?? '');

  const initialForm = {
    employeeId: typeof review?.employeeId === 'object' ? review.employeeId._id : review?.employeeId || '',
    period: defaultPeriod,
    rating: review?.rating?.toString() || '3',
    notes: review?.notes || '',
  };

  // Read sessionStorage once on mount; clear it immediately so it doesn't persist across navigations
  const [pendingRestore] = useState<Record<string, string> | null>(() => {
    const saved = sessionStorage.getItem('pending_form');
    if (!saved) return null;
    sessionStorage.removeItem('pending_form');
    try { return JSON.parse(saved); } catch { return null; }
  });

  // Frozen snapshot of the form at mount time — used for dirty-checking
  const [initialFormSnapshot] = useState(initialForm);

  const [form, setForm] = useState(() =>
    pendingRestore ? { ...initialForm, ...pendingRestore } : initialForm
  );
  const [touched, setTouched] = useState<Record<string, boolean>>(() =>
    pendingRestore
      ? Object.fromEntries(Object.keys(pendingRestore).map((k) => [k, true]))
      : {}
  );
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const words = useMemo(() => wordCount(form.notes), [form.notes]);
  const notesOk = words >= 5;

  const { data: empData } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeesApi.list({ limit: 100 }).then((r) => r.data),
    enabled: !isEdit,
  });
  const employees: Employee[] = empData?.data?.employees || empData?.data || [];

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        period: form.period.trim(),
        rating: Number(form.rating),
        notes: form.notes.trim(),
      };
      if (isEdit) return performanceApi.update(review._id, payload);
      return performanceApi.create({ ...payload, employeeId: form.employeeId });
    },
    onSuccess,
    onError: (e: unknown) => {
      const { message, field } = extractApiError(e, 'Save failed.');
      if (field) setFieldError((p) => ({ ...p, [field]: message }));
      else setError(message);
    },
  });

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setFieldError((p) => { const n = { ...p }; delete n[field]; return n; });
    setError('');
  }

  function handleBlur(field: string) {
    setTouched((p) => ({ ...p, [field]: true }));
  }

  // Live errors
  const errors: Record<string, string> = {};
  if (!isEdit && !form.employeeId) {
    errors.employeeId = 'Employee is required.';
  }
  if (!form.period) {
    errors.period = 'Review period is required.';
  }
  if (!notesOk) {
    errors.notes = 'Notes must contain at least 5 words.';
  }

  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialFormSnapshot);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDirty && isValid) {
      mutation.mutate();
    }
  };

  const isHrOrAdmin = user?.role === 'admin';

  // If no allowed quarters and not editing, block the form
  if (!isEdit && allowedQuarters.length === 0) {
    return (
      <div style={{ padding: 'var(--sp-6)', color: 'var(--t2)', fontSize: 14, background: 'var(--s1)', border: '1px solid var(--s3)', borderRadius: 'var(--r-md)' }}>
        {isHrOrAdmin ? (
          <div>
            <strong>Notice:</strong> As an HR/Admin, you can only submit reviews for the current quarter (<strong>{currentQuarterStr}</strong>).
            <p style={{ marginTop: 'var(--sp-2)', color: 'var(--t3)' }}>This quarter period is currently not open. Please open the review period first.</p>
          </div>
        ) : (
          <div>No review periods are currently open.</div>
        )}
      </div>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <ErrorBanner error={null} message={error} />}

      {isHrOrAdmin && !isEdit && (
        <div style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--s1)', border: '1px solid var(--s3)', borderRadius: 'var(--r-sm)', fontSize: '13px', color: 'var(--t2)' }}>
          ℹ HR/Admin role restriction: You are submitting this review for the current quarter (<strong>{currentQuarterStr}</strong>) only.
        </div>
      )}

      {!isEdit && (
        <div className="input-group">
          <label className="input-label">Employee</label>
          <select
            className={`input ${touched.employeeId && errors.employeeId ? 'has-error' : ''}`}
            name="employeeId"
            value={form.employeeId}
            onChange={(e) => set('employeeId', e.target.value)}
            onBlur={() => handleBlur('employeeId')}
            required
          >
            <option value="">— Select employee —</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>{emp.name} ({emp.employeeId})</option>
            ))}
          </select>
          {touched.employeeId && errors.employeeId && <span className="input-error-msg">{errors.employeeId}</span>}
          {fieldError.employeeId && <span className="input-error-msg">{fieldError.employeeId}</span>}
        </div>
      )}

      <div className="form-row">
        <div className="input-group">
          <label className="input-label">Review Period</label>
          {isEdit ? (
            <input
              className="input"
              name="period"
              value={form.period}
              readOnly
              style={{ background: 'var(--s1)', color: 'var(--t2)', cursor: 'not-allowed' }}
            />
          ) : (
            <select
              className={`input ${touched.period && errors.period ? 'has-error' : ''}`}
              name="period"
              value={form.period}
              onChange={(e) => set('period', e.target.value)}
              onBlur={() => handleBlur('period')}
              required
            >
              <option value="">— Select period —</option>
              {allowedQuarters.map((q) => (
                <option key={q._id} value={q.period}>
                  {q.period} — due {new Date(q.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </option>
              ))}
            </select>
          )}
          {touched.period && errors.period && <span className="input-error-msg">{errors.period}</span>}
          {fieldError.period && <span className="input-error-msg">{fieldError.period}</span>}
        </div>
        <div className="input-group">
          <label className="input-label">Rating</label>
          <select className="input" name="rating" value={form.rating} onChange={(e) => set('rating', e.target.value)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} / 5 {'★'.repeat(n)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="input-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-1)' }}>
          <label className="input-label" style={{ marginBottom: 0 }}>Notes</label>
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: notesOk ? '#059669' : words > 0 ? '#d97706' : 'var(--t3)',
          }}>
            {words} / 5 words {notesOk ? '✓' : '(min 5 words required)'}
          </span>
        </div>
        <textarea
          className={`input ${touched.notes && errors.notes ? 'has-error' : ''}`}
          name="notes"
          rows={4}
          style={{ resize: 'vertical' }}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          onBlur={() => handleBlur('notes')}
          placeholder="Describe performance highlights and areas for growth. At least 5 words required."
          required
        />
        {touched.notes && errors.notes && <span className="input-error-msg">{errors.notes}</span>}
        {fieldError.notes && <span className="input-error-msg">{fieldError.notes}</span>}
      </div>

      <button
        className="form-btn"
        type="submit"
        disabled={!isDirty || !isValid || mutation.isPending}
      >
        {mutation.isPending ? <span className="spinner" /> : isEdit ? 'Save Changes' : 'Create Review'}
      </button>
    </form>
  );
}
