import { NavLink, Outlet } from "react-router-dom";
import useAuth from "../auth/useAuth";
import "./BaseLayout.scss";
import "../styles/_buttons.scss";

export default function BaseLayout({ menu }) {
  const { logout, user } = useAuth();

  return (
    <div className="layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <h3>{user.role}</h3>

        <nav className="nav">
          {menu.map((item) => (
            <div key={item.path}>
              <NavLink to={item.path}>{item.label}</NavLink>
            </div>
          ))}
        </nav>

        <hr />
        <button className="btn-outline" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      {/* CONTENIDO */}
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
