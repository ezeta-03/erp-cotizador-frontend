import { Outlet, Link } from "react-router-dom";
import useAuth from "../auth/useAuth";

export default function BaseLayout({ menu }) {
  const { logout, user } = useAuth();

  return (
    <div>
      <header style={{ display: "flex", gap: 20 }}>
        <strong>{user.role}</strong>

        {menu.map((item) => (
          <Link key={item.path} to={item.path}>
            {item.label}
          </Link>
        ))}

        <button onClick={logout}>Salir</button>
      </header>

      <hr />

      <Outlet />
    </div>
  );
}
