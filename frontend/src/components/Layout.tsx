import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useOrg } from "../hooks/useOrg";
import { clsx } from "clsx";

const navItems = [
  { to: "/", label: "Priority Dashboard", icon: "ph-fill ph-circles-four", exact: true },
  { to: "/saved", label: "Saved Grants", icon: "ph ph-bookmark-simple", badge: true },
  { to: "/tracker", label: "Deadline Tracker", icon: "ph ph-calendar-check" },
  { to: "/onboarding", label: "Organization Profile", icon: "ph ph-buildings" },
];

export function Layout() {
  const { org } = useOrg();

  return (
    <div className="flex h-screen overflow-hidden selection:bg-brand-200 selection:text-brand-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 hidden md:flex flex-col justify-between z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0">
        <div>
          {/* Logo */}
          <div className="h-20 flex items-center px-6 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="bg-brand-50 text-brand-600 p-2 rounded-xl">
                <i className="ph ph-radar text-2xl animate-pulse-slow" />
              </div>
              <span className="font-serif text-2xl tracking-tight text-slate-900 font-semibold mt-0.5">
                GrantRadar
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="p-4 space-y-1.5 mt-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors group",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <i
                      className={clsx(
                        item.icon,
                        "text-lg",
                        !isActive && "text-slate-400 group-hover:text-slate-600"
                      )}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User area */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 mb-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <i className="ph-fill ph-sparkle text-4xl text-brand-600" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                AI Discovery
              </span>
              <i className="ph-fill ph-lightning text-amber-400" />
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1.5">
              <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: "65%" }} />
            </div>
            <p className="text-xs text-slate-500">AI matching active</p>
          </div>

          {org && (
            <div className="flex items-center gap-3 p-2 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                {org.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{org.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">
                  {org.orgType.toLowerCase().replace(/_/g, " ")}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top right, rgba(245,243,255,0.5) 0%, transparent 60%)",
          }}
        />
        <div className="flex-1 overflow-y-auto relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
