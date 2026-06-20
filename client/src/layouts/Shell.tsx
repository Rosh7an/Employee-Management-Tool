import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../store/auth.store';

export function Shell() {
  const { token } = useAuthStore();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="shell">
      <Sidebar />
      <main className="main-content">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
