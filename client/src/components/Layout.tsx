import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <nav className="nav-bg text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-lg tracking-tight">Partner Voting</span>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm font-medium transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/proxy"
              className={({ isActive }) =>
                `text-sm font-medium transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`
              }
            >
              My Proxy
            </NavLink>
            {user?.role === 'ADMIN' && (
              <>
                <NavLink
                  to="/admin"
                  end
                  className={({ isActive }) =>
                    `text-sm font-medium transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`
                  }
                >
                  Admin
                </NavLink>
                <NavLink
                  to="/admin/audit"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`
                  }
                >
                  Audit Log
                </NavLink>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-80">{user?.name}</span>
            {user?.role === 'ADMIN' && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">Admin</span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm opacity-70 hover:opacity-100 transition-opacity ml-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
