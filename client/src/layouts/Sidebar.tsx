import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

const NAV = [
  { to: '/dashboard',   label: 'Dashboard',   icon: '⌗' },
  { to: '/employees',   label: 'Employees',   icon: '👤' },
  { to: '/departments', label: 'Departments', roles: ['admin'], icon: '⎇' },
  { to: '/leave',       label: 'Leave',       icon: '🗓' },
  { to: '/payroll',     label: 'Payroll',     icon: '＄' },
  { to: '/performance', label: 'Performance', icon: '★' },
  { to: '/milestones',  label: 'Milestones',  icon: '◎' },
  { to: '/audit',       label: 'Audit Logs',  roles: ['admin'], icon: '▤' },
];

export function Sidebar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const visible = NAV.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand" style={{ justifyContent: isCollapsed ? 'center' : 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', overflow: 'hidden' }}>
            <div className="sidebar-brand-mark">EM</div>
            {!isCollapsed && <span className="sidebar-brand-text">EMT</span>}
          </div>
          <button
            onClick={toggleCollapse}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--sb-text)',
              fontSize: '14px',
              padding: '4px 8px',
              cursor: 'pointer',
            }}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }: { isActive: boolean }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
              {!isCollapsed && <span className="sidebar-link-text" style={{ marginLeft: 'var(--sp-2)' }}>{item.label}</span>}
              <span className="sidebar-link-dot" />
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="sidebar-footer">
          <div className="sidebar-user" style={{ cursor: 'pointer' }} title="View profile" onClick={() => navigate('/profile')}>
            <div className="sidebar-avatar">{initials}</div>
            {!isCollapsed && (
              <>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name" title={user?.name}>{user?.name}</div>
                  <div className="sidebar-user-role">{user?.role}</div>
                </div>
                <button
                  className="sidebar-signout"
                  onClick={(e) => { e.stopPropagation(); setShowLogoutModal(true); }}
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Logout</h2>
            <p className="modal-message">Are you sure you want to log out of the system?</p>
            <div className="modal-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => { clearAuth(); navigate('/login'); }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
