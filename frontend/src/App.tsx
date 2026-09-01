import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import CsvImport from "@/pages/CsvImport";
import Categories from "@/pages/Categories";
import Accounts from "@/pages/Accounts";
import Recurring from "@/pages/Recurring";
import CashFlow from "@/pages/CashFlow";
import Assistant from "@/pages/Assistant";
import Forecasts from "@/pages/Forecasts";
import Subscriptions from "@/pages/Subscriptions";
import Anomalies from "@/pages/Anomalies";
import Coach from "@/pages/Coach";
import Recaps from "@/pages/Recaps";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/transactions/import" element={<CsvImport />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/cashflow" element={<CashFlow />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/forecasts" element={<Forecasts />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/anomalies" element={<Anomalies />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/recaps" element={<Recaps />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
