import { useState, useRef, useLayoutEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Banknote,
  TrendingUp,
  Flag,
  ScrollText,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
}

const NAV: NavItem[] = [
  { to: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/employees',   label: 'Employees',   icon: Users },
  { to: '/departments', label: 'Departments', icon: Building2,      roles: ['admin'] },
  { to: '/leave',       label: 'Leave',       icon: CalendarDays },
  { to: '/payroll',     label: 'Payroll',     icon: Banknote },
  { to: '/performance', label: 'Performance', icon: TrendingUp },
  { to: '/milestones',  label: 'Milestones',  icon: Flag },
  { to: '/audit',       label: 'Audit Logs',  icon: ScrollText,     roles: ['admin'] },
];

interface IndicatorPos { top: number; height: number; left: number; right: number; }

export function Sidebar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [indicator, setIndicator] = useState<IndicatorPos | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const visible = NAV.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const activeIndex = visible.findIndex((item) =>
    item.to === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(item.to)
  );

  useLayoutEffect(() => {
    if (!navRef.current || activeIndex < 0) {
      setIndicator(null);
      return;
    }
    const links = navRef.current.querySelectorAll<HTMLElement>('.sidebar-link');
    const active = links[activeIndex];
    if (!active) return;
    const navW = navRef.current.offsetWidth;
    setIndicator({
      top:    active.offsetTop,
      height: active.offsetHeight,
      left:   active.offsetLeft,
      right:  navW - active.offsetLeft - active.offsetWidth,
    });
  }, [activeIndex, isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand" style={{ justifyContent: isCollapsed ? 'center' : 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', overflow: 'hidden' }}>
            <div className="sidebar-brand-mark">
              <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="10" r="6" fill="currentColor" opacity="0.95"/>
                <circle cx="10" cy="38" r="6" fill="currentColor" opacity="0.8"/>
                <circle cx="38" cy="38" r="6" fill="currentColor" opacity="0.8"/>
                <line x1="24" y1="16" x2="10" y2="32" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.7"/>
                <line x1="24" y1="16" x2="38" y2="32" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.7"/>
                <line x1="10" y1="38" x2="38" y2="38" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.5"/>
              </svg>
            </div>
            {!isCollapsed && <span className="sidebar-brand-text">Employee Management</span>}
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
        <nav ref={navRef} className="sidebar-nav" style={{ position: 'relative' }}>
          {/* Sliding active pill */}
          {indicator && (
            <div
              className="sidebar-active-indicator"
              style={{
                top:    indicator.top,
                height: indicator.height,
                left:   indicator.left,
                right:  indicator.right,
              }}
            />
          )}

          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }: { isActive: boolean }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <Icon size={17} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                {!isCollapsed && (
                  <span className="sidebar-link-text" style={{ marginLeft: 'var(--sp-2)' }}>
                    {item.label}
                  </span>
                )}
                <span className="sidebar-link-dot" />
              </NavLink>
            );
          })}
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
