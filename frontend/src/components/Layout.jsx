import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { Icon } from "./ui.jsx";

const LINKS = [
  { to: "/", label: "Confirmations", icon: Icon.dashboard, end: true },
  { to: "/vendors", label: "Vendors", icon: Icon.vendors },
  { to: "/history", label: "Send history", icon: Icon.send },
  { to: "/settings", label: "Settings", icon: Icon.settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  // close drawer on navigation (mobile)
  const close = () => setOpen(false);

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="logo">2M</div>
          <div>
            <div className="name">Invoicer</div>
            <div className="sub">ACH Confirmations</div>
          </div>
        </div>
        <nav className="nav" onClick={close}>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) => (isActive ? "active" : "")}>
              <l.icon /> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <div className="userbox">
          <div className="uname">{user?.full_name || user?.username}</div>
          <div className="sub" style={{ color: "#7f97bb" }}>@{user?.username}</div>
          <button className="logout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <div className={`backdrop ${open ? "show" : ""}`} onClick={close} />

      <div className="main">
        <div className="topbar">
          <button className="burger" onClick={() => setOpen(true)} aria-label="Menu">☰</button>
          <strong>Invoicer</strong>
          <span style={{ width: 22 }} />
        </div>
        <div className="content" key={loc.pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
