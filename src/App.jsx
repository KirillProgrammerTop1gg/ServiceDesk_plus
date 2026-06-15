import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "./styles/theme";
import { GlobalStyle } from "./styles/GlobalStyle";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyRequestsPage from "./pages/MyRequestsPage";
import AddRequestPage from "./pages/AddRequestPage";
import CheckMessagePage from "./pages/CheckMessagePage";
import ServiceRecordPage from "./pages/ServiceRecordPage";
import AdminPage from "./pages/AdminPage";
import AdminProblemPage from "./pages/AdminProblemPage";
import UnifiedRequestDetailPage from "./pages/UnifiedRequestDetailPage";
import AddAnswerPage from "./pages/AddAnswerPage";
import ServiceCompletePage from "./pages/ServiceCompletePage";
import AdminStatsPage from "./pages/AdminStatsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import NotFoundPage from "./pages/NotFoundPage";
import AccountPage from "./pages/AccountPage";


export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AuthProvider>
        <BrowserRouter basename="/ServiceDesk_plus/">
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* User (authenticated) */}
            <Route
              path="/requests"
              element={
                <ProtectedRoute>
                  <MyRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests/new"
              element={
                <ProtectedRoute>
                  <AddRequestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests/:id"
              element={
                <ProtectedRoute>
                  <UnifiedRequestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/message/:id"
              element={
                <ProtectedRoute>
                  <UnifiedRequestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/service-record/:id"
              element={
                <ProtectedRoute>
                  <ServiceRecordPage />
                </ProtectedRoute>
              }
            />

            {/* Admin only / Staff routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute role={["admin", "manager", "master"]}>
                  <MyRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/problem/:id"
              element={
                <ProtectedRoute role={["admin", "manager", "master"]}>
                  <UnifiedRequestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/my-problems"
              element={
                <ProtectedRoute role={["admin", "manager", "master"]}>
                  <MyRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/answer/:id"
              element={
                <ProtectedRoute role={["admin", "manager", "master"]}>
                  <AddAnswerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complete/:id"
              element={
                <ProtectedRoute role={["admin", "manager", "master"]}>
                  <ServiceCompletePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/stats"
              element={
                <ProtectedRoute role={["admin", "manager"]}>
                  <AdminStatsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute role="admin">
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
