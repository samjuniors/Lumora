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
import { dbService } from "./services/dbProvider";
import { unlockAudio } from "./lib/audio";
import { Navbar } from "./components/Navbar";
import { SplashScreen } from "./components/SplashScreen";
import { DailyRewardModal } from "./components/DailyRewardModal";
import { NotificationManager } from "./components/NotificationManager";
const AIPet = React.lazy(() => import("./components/AIPet").then(m => ({ default: m.AIPet })));
const AdminPet = React.lazy(() => import("./components/AdminPet").then(m => ({ default: m.AdminPet })));
import { VersionUpdateModal } from "./components/VersionUpdateModal";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { InstallPrompt } from "./components/InstallPrompt";
import { getCleanInventory } from "./lib/utils";

// Lazy load pages for performance
const Login = React.lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Dashboard = React.lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Assignments = React.lazy(() => import("./pages/Assignments").then(m => ({ default: m.Assignments })));
const AssignmentDetail = React.lazy(() => import("./pages/AssignmentDetail").then(m => ({ default: m.AssignmentDetail })));
const Wallet = React.lazy(() => import("./pages/Wallet").then(m => ({ default: m.Wallet })));
const Leaderboard = React.lazy(() => import("./pages/Leaderboard").then(m => ({ default: m.Leaderboard })));
const AdminPanel = React.lazy(() => import("./pages/Admin").then(m => ({ default: m.AdminPanel })));
const AdminAnalytics = React.lazy(() => import("./pages/AdminAnalytics").then(m => ({ default: m.AdminAnalytics })));
const Scorecard = React.lazy(() => import("./pages/Scorecard").then(m => ({ default: m.Scorecard })));
const Shop = React.lazy(() => import("./pages/Shop").then(m => ({ default: m.Shop })));
const Profile = React.lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Badges = React.lazy(() => import("./pages/Badges").then(m => ({ default: m.Badges })));
const Syndicates = React.lazy(() => import("./pages/Syndicates").then(m => ({ default: m.Syndicates })));

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "linear" }}
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
          <React.Suspense fallback={<SplashScreen />}>
            <PageWrapper>
              <Login />
            </PageWrapper>
          </React.Suspense>
        }
      />
      <Route
        path="/dashboard"
        element={
          <React.Suspense fallback={<SplashScreen />}>
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
          <React.Suspense fallback={<SplashScreen />}>
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
          <React.Suspense fallback={<SplashScreen />}>
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
          <React.Suspense fallback={<SplashScreen />}>
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
          <React.Suspense fallback={<SplashScreen />}>
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
          <React.Suspense fallback={<SplashScreen />}>
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
          <React.Suspense fallback={<SplashScreen />}>
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
          <React.Suspense fallback={<SplashScreen />}>
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
          <React.Suspense fallback={<SplashScreen />}>
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
          <React.Suspense fallback={<SplashScreen />}>
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
          <React.Suspense fallback={<SplashScreen />}>
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
          <React.Suspense fallback={<SplashScreen />}>
            <RequireAuth>
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

  React.useEffect(() => {
    if (user?.id) {
      // Balance cleanup - ensure minimum coins is 0
      if ((user.coins || 0) < 0) {
        dbService.updateUser(user.id, {
          coins: 0
        }).catch(err => console.error("Balance correction failed:", err));
      }

      // Inventory cleanup - only if needed
      const cleanInv = getCleanInventory(user);
      if (cleanInv.length !== (user.inventory?.length || 0)) {
        dbService.updateUser(user.id, {
          inventory: cleanInv
        }).catch(err => console.error("Inventory cleanup failed:", err));
      }

      // Welcome notification - strictly once per 24 hours
      const storageKey = `welcome_notified_${user.id}`;
      const lastNotified = localStorage.getItem(storageKey);
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;

      if (!lastNotified || now - parseInt(lastNotified) > ONE_DAY) {
        localStorage.setItem(storageKey, now.toString());
        dbService.createNotification({
          userId: user.id,
          title: `Welcome back, ${user.name}!`,
          message: "Ready for today's research missions?",
          type: 'info',
          read: false,
          createdAt: Date.now()
        }).catch(err => console.error("Welcome notification failed:", err));
      }
    }
  }, [user?.id]); // Only run when user ID changes (login/logout)

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
          className: "rounded-2xl font-semibold shadow-lg",
          duration: 2000,
          style: {
            background: '#081B33',
            color: '#F7F7F5',
            border: '1px solid #142A4A',
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
      <main className="flex-grow w-full relative pb-[calc(136px+env(safe-area-inset-bottom))] md:pb-8 pt-[calc(72px+env(safe-area-inset-top))] md:pt-[calc(88px+env(safe-area-inset-top))] overflow-x-hidden">
        <div className="container mx-auto px-4 py-4 md:py-8 min-h-full">
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
