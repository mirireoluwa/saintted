import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PublicShell } from "./components/PublicShell";
import { HomePage } from "./pages/HomePage";
import { TrackDetailPage } from "./pages/TrackDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { isAdminHostname } from "./utils/adminHost";
import "./index.css";

const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((m) => ({ default: m.AdminPage }))
);

const isAdminHost =
  typeof window !== "undefined" && isAdminHostname(window.location.hostname);

function App() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <Suspense fallback={null}>
            <AdminPage />
          </Suspense>
        }
      />
      {isAdminHost ? (
        <>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </>
      ) : (
        <Route path="/" element={<PublicShell />}>
          <Route index element={<HomePage />} />
          <Route path="music/:slug" element={<TrackDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      )}
    </Routes>
  );
}

export default App;
