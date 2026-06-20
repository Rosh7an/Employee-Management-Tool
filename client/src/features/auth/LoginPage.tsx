import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from './auth.api';
import { extractApiError } from '../../lib/axios';

type Tab = 'login' | 'register';

export function LoginPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const PASSWORD_HINT =
    'At least 8 characters with uppercase, lowercase, number and special character.';

  function validateField(field: string, value: string): string {
    if (field === 'name' && !value.trim()) return 'Full name is required';
    if (field === 'email') {
      if (!value.trim()) return 'Email is required';
      if (!/\S+@\S+\.\S+/.test(value)) return 'Invalid email address';
    }
    if (field === 'password') {
      if (!value) return 'Password is required';
      if (tab === 'register') {
        if (value.length < 8) return 'At least 8 characters';
        if (!/[A-Z]/.test(value)) return 'Must contain an uppercase letter';
        if (!/[a-z]/.test(value)) return 'Must contain a lowercase letter';
        if (!/[0-9]/.test(value)) return 'Must contain a number';
        if (!/[@$!%*?&#^()_+\-=]/.test(value)) return 'Must contain a special character';
      }
    }
    if (field === 'confirmPassword' && value !== form.password) return 'Passwords do not match';
    return '';
  }

  function validateAll(): Record<string, string> {
    const fields = tab === 'login'
      ? ['email', 'password']
      : ['name', 'email', 'password', 'confirmPassword'];
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const msg = validateField(f, form[f as keyof typeof form]);
      if (msg) errs[f] = msg;
    }
    return errs;
  }

  function handleBlur(field: string) {
    const msg = validateField(field, form[field as keyof typeof form]);
    setErrors((prev) => msg ? { ...prev, [field]: msg } : (({ [field]: _, ...rest }) => rest)(prev));
  }

  function handleChange(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setSubmitError('');
    if (errors[field]) {
      const msg = validateField(field, value);
      setErrors((prev) => msg ? { ...prev, [field]: msg } : (({ [field]: _, ...rest }) => rest)(prev));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const allErrors = validateAll();
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }
    setSubmitError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        const res = await authApi.login({ email: form.email, password: form.password });
        const { token, user } = res.data.data;
        setAuth(token, user);
        navigate('/dashboard', { replace: true });
      } else {
        const res = await authApi.register(form);
        const { token, user } = res.data.data;
        setAuth(token, user);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const { message: msg, field } = extractApiError(err);
      if (field) setErrors((p) => ({ ...p, [field]: msg }));
      else setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t: Tab) {
    setTab(t);
    setErrors({});
    setSubmitError('');
  }

  return (
    <div className="auth-wrap">
      {/* Left branding panel */}
      <div className="auth-panel-left">
        <div className="auth-brand-logo">EM</div>

        <div className="auth-panel-left-body">
          <h2>Manage your workforce with confidence.</h2>
          <p>
            A unified platform for employees, departments, leave, payroll,
            attendance, and performance — built for modern teams.
          </p>
        </div>

        <div className="auth-testimonial">
          <p>"The cleanest HR system we've ever used. Everything is exactly where you expect it to be."</p>
          <div className="auth-testimonial-source">— HR Director, Engineering Org</div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-panel-right">
        <div className="auth-box">
          <h1 className="auth-box-title">
            {tab === 'login' ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="auth-box-sub">
            {tab === 'login'
              ? 'Enter your credentials to access the dashboard.'
              : 'Register to join your organization\'s workspace.'}
          </p>

          {params.get('expired') === '1' && (
            <div className="error-banner" style={{ marginBottom: 'var(--sp-5)' }}>
              Your session expired. Please sign in again.
            </div>
          )}

          <div className="auth-tabs">
            <button className={`auth-tab-btn${tab === 'login' ? ' active' : ''}`} onClick={() => switchTab('login')}>
              Sign in
            </button>
            <button className={`auth-tab-btn${tab === 'register' ? ' active' : ''}`} onClick={() => switchTab('register')}>
              Register
            </button>
          </div>

          <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }} onSubmit={handleSubmit}>
            {submitError && <div className="error-banner">{submitError}</div>}

            {tab === 'register' && (
              <div className="input-group">
                <label className="input-label" htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name" name="name" className={`input${errors.name ? ' has-error' : ''}`}
                  type="text" placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  required
                />
                {errors.name && <span className="input-error-msg">{errors.name}</span>}
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="auth-email">Email address</label>
              <input
                id="auth-email" name="email" className={`input${errors.email ? ' has-error' : ''}`}
                type="email" placeholder="you@company.com"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                required
              />
              {errors.email && <span className="input-error-msg">{errors.email}</span>}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="auth-password">Password</label>
              <input
                id="auth-password" name="password" className={`input${errors.password ? ' has-error' : ''}`}
                type="password" placeholder={tab === 'register' ? PASSWORD_HINT : '••••••••'}
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                required
              />
              {errors.password && <span className="input-error-msg">{errors.password}</span>}
            </div>

            {tab === 'register' && (
              <div className="input-group">
                <label className="input-label" htmlFor="auth-confirm">Confirm password</label>
                <input
                  id="auth-confirm" name="confirmPassword"
                  className={`input${errors.confirmPassword ? ' has-error' : ''}`}
                  type="password" placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  required
                />
                {errors.confirmPassword && <span className="input-error-msg">{errors.confirmPassword}</span>}
              </div>
            )}

            <button
              className="btn"
              type="submit"
              disabled={loading}
              style={{ height: 42, fontSize: 14.5, marginTop: 'var(--sp-2)' }}
            >
              {loading
                ? <span className="spinner" />
                : tab === 'login' ? 'Continue →' : 'Create account'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
