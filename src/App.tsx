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
// Lazy load components/pages with retry logic for robustness
const lazyRetry = (componentImport: any) => 
  React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Lazy load failed, retrying...", error);
      // Retry once after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      return await componentImport();
    }
  });

const AIPet = lazyRetry(() => import("./components/AIPet").then(m => ({ default: m.AIPet })));
const AdminPet = lazyRetry(() => import("./components/AdminPet").then(m => ({ default: m.AdminPet })));
import { VersionUpdateModal } from "./components/VersionUpdateModal";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { InstallPrompt } from "./components/InstallPrompt";
import { getCleanInventory } from "./lib/utils";

// Lazy load pages for performance
const Login = lazyRetry(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Dashboard = lazyRetry(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Assignments = lazyRetry(() => import("./pages/Assignments").then(m => ({ default: m.Assignments })));
const AssignmentDetail = lazyRetry(() => import("./pages/AssignmentDetail").then(m => ({ default: m.AssignmentDetail })));
const Wallet = lazyRetry(() => import("./pages/Wallet").then(m => ({ default: m.Wallet })));
const Leaderboard = lazyRetry(() => import("./pages/Leaderboard").then(m => ({ default: m.Leaderboard })));
const AdminPanel = lazyRetry(() => import("./pages/Admin").then(m => ({ default: m.AdminPanel })));
const AdminAnalytics = lazyRetry(() => import("./pages/AdminAnalytics").then(m => ({ default: m.AdminAnalytics })));
const Scorecard = lazyRetry(() => import("./pages/Scorecard").then(m => ({ default: m.Scorecard })));
const Shop = lazyRetry(() => import("./pages/Shop").then(m => ({ default: m.Shop })));
const Profile = lazyRetry(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Badges = lazyRetry(() => import("./pages/Badges").then(m => ({ default: m.Badges })));
const Syndicates = lazyRetry(() => import("./pages/Syndicates").then(m => ({ default: m.Syndicates })));

import { useMaintenance } from "./hooks/useMaintenance";

const RequireAuth: React.FC<{ children: React.ReactNode, adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const itemVariants = {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.98 },
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ 
        duration: 0.4, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      className="h-full w-full relative"
    >
      {children}
    </motion.div>
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
          <React.Suspense fallback={<div className="h-[100dvh] bg-bg-main" />}>
            <PageWrapper>
              <Login />
            </PageWrapper>
          </React.Suspense>
        }
      />
      <Route
        path="/dashboard"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth>
              <PageWrapper>
                <Dashboard />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
        }
      />
      <Route
        path="/assignments"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth>
              <PageWrapper>
                <Assignments />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
        }
      />
      <Route
        path="/assignments/:id"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth>
              <PageWrapper>
                <AssignmentDetail />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
        }
      />
      <Route
        path="/wallet"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth>
              <PageWrapper>
                <Wallet />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
        }
      />
      <Route
        path="/shop"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth>
              <PageWrapper>
                <Shop />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
        }
      />
      <Route
        path="/profile"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth>
              <PageWrapper>
                <Profile />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
        }
      />
      <Route
        path="/badges"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth>
              <PageWrapper>
                <Badges />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
        }
      />
      <Route
        path="/syndicates"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth>
              <PageWrapper>
                <Syndicates />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth>
              <PageWrapper>
                <Leaderboard />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
        }
      />
      <Route
        path="/scorecard"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth>
              <PageWrapper>
                <Scorecard />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
        }
      />
      <Route
        path="/scorecard/:studentId"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth>
              <PageWrapper>
                <Scorecard />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
        }
      />
      <Route
        path="/admin"
        element={
          <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-bg-surface/5 rounded-2xl min-h-[50vh]" />}>
            <RequireAuth adminOnly>
              <PageWrapper>
                <AdminPanel />
              </PageWrapper>
            </RequireAuth>
          </React.Suspense>
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
