import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { TrackDetailPage } from "./pages/TrackDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminPage } from "./pages/AdminPage";
import "./index.css";

const isAdminHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "admin.saintted.com" ||
    window.location.hostname === "admin.localhost");

function App() {
  return (
    <>
      <Routes>
        {isAdminHost && <Route path="/" element={<Navigate to="/admin" replace />} />}
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/music/:slug" element={<TrackDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
