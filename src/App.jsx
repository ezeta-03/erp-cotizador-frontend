import { BrowserRouter } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import AppRouter from "./routes/AppRouter";
import "./styles/main.scss";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
