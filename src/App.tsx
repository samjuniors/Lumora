import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Toaster, useToasterStore, toast as toastRef } from "react-hot-toast";
import { AnimatePresence, motion } from "motion/react";
import { useSwipeable } from "react-swipeable";
import { usePresence } from "./hooks/usePresence";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { unlockAudio } from "./lib/audio";
import { Navbar } from "./components/Navbar";
import { SplashScreen } from "./components/SplashScreen";
import { DailyRewardModal } from "./components/DailyRewardModal";
import { NotificationManager } from "./components/NotificationManager";
import { AIPet } from "./components/AIPet";
import { AdminPet } from "./components/AdminPet";
import { VersionUpdateModal } from "./components/VersionUpdateModal";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { InstallPrompt } from "./components/InstallPrompt";
import { DashboardSkeleton, ListSkeleton, AssignmentDetailSkeleton } from "./components/Skeletons";
import { getCleanInventory } from "./lib/utils";

// Pages
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Assignments } from "./pages/Assignments";
import { AssignmentDetail } from "./pages/AssignmentDetail";
import { Wallet } from "./pages/Wallet";
import { Leaderboard } from "./pages/Leaderboard";
import { AdminPanel } from "./pages/Admin";
import { AdminAnalytics } from "./pages/AdminAnalytics";
import { Scorecard } from "./pages/Scorecard";
import { Shop } from "./pages/Shop";
import { Profile } from "./pages/Profile";
import { Badges } from "./pages/Badges";
import { Syndicates } from "./pages/Syndicates";

import { useMaintenance } from "./hooks/useMaintenance";

const RequireAuth: React.FC<{ children: React.ReactNode, adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-full w-full relative animate-in fade-in duration-200">
      {children}
    </div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Track presence
  usePresence(user?.id);

  return (
    <Routes location={location}>
      <Route
        path="/login"
        element={
          <PageWrapper>
            <Login />
          </PageWrapper>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <PageWrapper>
              <Dashboard />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/assignments"
        element={
          <RequireAuth>
            <PageWrapper>
              <Assignments />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/assignments/:id"
        element={
          <RequireAuth>
            <PageWrapper>
              <AssignmentDetail />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/wallet"
        element={
          <RequireAuth>
            <PageWrapper>
              <Wallet />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/shop"
        element={
          <RequireAuth>
            <PageWrapper>
              <Shop />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <PageWrapper>
              <Profile />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/badges"
        element={
          <RequireAuth>
            <PageWrapper>
              <Badges />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/syndicates"
        element={
          <RequireAuth>
            <PageWrapper>
              <Syndicates />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <RequireAuth>
            <PageWrapper>
              <Leaderboard />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/scorecard"
        element={
          <RequireAuth>
            <PageWrapper>
              <Scorecard />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/scorecard/:studentId"
        element={
          <RequireAuth>
            <PageWrapper>
              <Scorecard />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth adminOnly>
            <PageWrapper>
              <AdminPanel />
            </PageWrapper>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts } = useToasterStore();

  // Scroll to top on location change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, location.search]);

  // Limit toasts to 5 (dismiss oldest first)
  useEffect(() => {
    const visibleToasts = toasts.filter((t) => t.visible);
    if (visibleToasts.length > 5) {
      visibleToasts
        .slice(0, visibleToasts.length - 5)
        .forEach((t) => toastRef.dismiss(t.id));
    }
  }, [toasts]);

  // Handle essential user maintenance tasks
  useMaintenance(user);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div
      onClick={unlockAudio}
      className="min-h-[100dvh] bg-bg-main flex flex-col font-sans relative overflow-x-hidden"
    >
      <Toaster
        position="top-center"
        toastOptions={{ 
          className: "rounded-2xl font-semibold shadow-2xl border border-white/10",
          duration: 3000,
          style: {
            background: 'rgba(10, 15, 30, 0.98)',
            color: '#F7F7F5',
            backdropFilter: 'blur(10px)',
          },
          success: {
            iconTheme: {
              primary: '#D4AF37',
              secondary: '#081B33',
            },
          },
        }}
      />
      <Navbar />
      <main className="flex-grow w-full relative pb-safe-bottom md:pb-8 pt-safe-top-nav overflow-x-hidden md:px-0">
        <div className="mx-auto max-w-7xl px-0 md:px-6 lg:px-8">
          <AnimatedRoutes />
          <DailyRewardModal />
          <VersionUpdateModal />
          <PWAUpdatePrompt />
          <InstallPrompt />
          <React.Suspense fallback={null}>
            <AIPet />
            <AdminPet />
          </React.Suspense>
          <NotificationManager />
        </div>
      </main>
    </div>
  );
};

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
