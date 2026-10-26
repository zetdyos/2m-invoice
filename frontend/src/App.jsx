import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Confirmations from "./pages/Confirmations.jsx";
import Vendors from "./pages/Vendors.jsx";
import History from "./pages/History.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="center-spin"><span className="spinner" /></div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route index element={<Confirmations />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
