import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useUIStore } from '@/stores/uiStore';
import clsx from 'clsx';

const navItems = [
  {
    to: '/app',
    label: 'Home',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    end: true,
  },
  {
    to: '/app/scan',
    label: 'Scan',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    to: '/app/settings',
    label: 'Settings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const adminNavItem = {
  to: '/app/admin/orders',
  label: 'Admin',
  icon: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

function SidebarNav() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useSubscriptionStore((s) => s.isAdmin);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-cream-surface border-r border-border-light min-h-screen pt-[3px]">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border-light">
        <NavLink to="/" className="font-display text-xl font-extrabold text-walnut">
          Kept<span className="text-terracotta">Pages</span>
        </NavLink>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md font-ui text-sm transition-colors',
                isActive
                  ? 'bg-terracotta-light text-terracotta font-medium'
                  : 'text-walnut-secondary hover:bg-cream-alt hover:text-walnut'
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to={adminNavItem.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md font-ui text-sm transition-colors',
                isActive
                  ? 'bg-terracotta-light text-terracotta font-medium'
                  : 'text-walnut-secondary hover:bg-cream-alt hover:text-walnut'
              )
            }
          >
            {adminNavItem.icon}
            {adminNavItem.label}
          </NavLink>
        )}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-border-light">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-terracotta flex items-center justify-center text-white font-ui text-sm font-semibold">
            {user?.user_metadata?.name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-ui text-sm font-medium text-walnut truncate">
              {user?.user_metadata?.name || user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-walnut-muted hover:text-walnut transition-colors"
            title="Log out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

function BottomTabs() {
  const isAdmin = useSubscriptionStore((s) => s.isAdmin);
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-cream-surface/95 backdrop-blur-md border-t border-border-light z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md font-ui text-[10px] transition-colors',
                isActive
                  ? 'text-terracotta'
                  : 'text-walnut-muted'
              )
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to={adminNavItem.to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md font-ui text-[10px] transition-colors',
                isActive ? 'text-terracotta' : 'text-walnut-muted'
              )
            }
          >
            {adminNavItem.icon}
            <span>{adminNavItem.label}</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}

function TopBar() {
  const { user } = useAuthStore();
  const logout = useAuthStore((s) => s.logout);
  const { tier } = useSubscriptionStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <header className="lg:hidden sticky top-[3px] z-30 bg-cream-surface/95 backdrop-blur-md border-b border-border-light">
      <div className="flex items-center justify-between px-4 py-3">
        <NavLink to="/" className="font-display text-lg font-extrabold text-walnut">
          Kept<span className="text-terracotta">Pages</span>
        </NavLink>
        <div className="flex items-center gap-2">
          {tier === 'free' && (
            <NavLink
              to="/app/settings"
              className="font-ui text-[10px] font-semibold uppercase tracking-wider text-terracotta bg-terracotta-light px-2 py-1 rounded-pill"
            >
              Upgrade
            </NavLink>
          )}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-7 h-7 rounded-full bg-terracotta flex items-center justify-center text-white font-ui text-xs font-semibold"
            >
              {user?.user_metadata?.name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-md shadow-lg border border-border-light py-1 z-50">
                <p className="px-3 py-1.5 font-ui text-xs text-walnut-muted truncate border-b border-border-light">
                  {user?.email}
                </p>
                <NavLink
                  to="/app/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 font-ui text-sm text-walnut hover:bg-cream-alt transition-colors"
                >
                  Settings
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 font-ui text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-cream pt-[3px]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-4 focus:left-4 focus:bg-terracotta focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:font-ui focus:text-sm"
      >
        Skip to content
      </a>
      <SidebarNav />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main id="main-content" className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>
        <BottomTabs />
      </div>
    </div>
  );
}
