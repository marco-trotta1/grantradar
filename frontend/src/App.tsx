import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Onboarding } from "./pages/Onboarding";
import { GrantDetail } from "./pages/GrantDetail";
import { Tracker } from "./pages/Tracker";
import { SavedGrants } from "./pages/SavedGrants";
import { getLocalOrgId } from "./lib/api";

function RequireOrg({ children }: { children: React.ReactNode }) {
  const orgId = getLocalOrgId();
  if (!orgId) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/"
          element={
            <RequireOrg>
              <Layout />
            </RequireOrg>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="grants/:id" element={<GrantDetail />} />
          <Route path="saved" element={<SavedGrants />} />
          <Route path="tracker" element={<Tracker />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
