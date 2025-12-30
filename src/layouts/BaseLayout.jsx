import { NavLink, Outlet } from "react-router-dom";
import useAuth from "../auth/useAuth";

export default function BaseLayout({ menu }) {
  const { logout, user } = useAuth();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <aside style={{ width: 220, padding: 20, background: "#f4f4f4" }}>
        <h3>{user.role}</h3>

        <nav>
          {menu.map((item) => (
            <div key={item.path}>
              <NavLink to={item.path}>{item.label}</NavLink>
            </div>
          ))}
        </nav>

        <hr />
        <button onClick={logout}>Cerrar sesión</button>
      </aside>

      {/* CONTENIDO */}
      <main style={{ flex: 1, padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}
