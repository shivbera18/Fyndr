import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { ThemeProvider } from './component/landing/Theme';
import { Toaster } from './components/ui/sonner';
import BottomNav from './component/navbar/BottomNav';
import { PWAInstallBanner, PWAOfflineIndicator } from './components/pwa';

// ponytail: route-level code splitting — landing bundle no longer ships
// dashboard/camera/analytics JS. Add new pages as lazy() here, never eager.
const Home = lazy(() => import('./component/home/Home'));
const About = lazy(() => import('./component/About'));
const LoginRegister = lazy(() => import(/* webpackPrefetch: true */ './component/login/Login_Register'));
const EmailVerified = lazy(() => import('./component/login/EmailVerify'));
const ConfirmVerify = lazy(() => import('./component/login/ConfirmVerify'));
const ForgetPass = lazy(() => import('./component/login/ForgetPass'));
const Dashboard = lazy(() => import('./component/dashboard/Dashboard'));
const CreateEventPage = lazy(() => import('./component/dashboard/CreateEventPage'));
const AnalyticsPage = lazy(() => import('./component/dashboard/AnalyticsPage'));
const SettingsPage = lazy(() => import('./component/dashboard/SettingsPage'));
const AccountPage = lazy(() => import('./component/dashboard/AccountPage'));
const GuestAnalyticsPage = lazy(() => import('./component/dashboard/GuestAnalyticsPage'));
const CollectEvent = lazy(() => import('./component/collect_images/Collect_event'));
const SelectEvent = lazy(() => import('./component/select/Select_event'));
const CameraCaptureWithMask = lazy(() => import('./component/collect_images/CameraCaptureWithMask'));
const ReelPage = lazy(() => import('./component/collect_images/reel/ReelPage'));

// Reset scroll on page switch; hash links are handled by the target page.
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground" role="status">
      Loading…
    </div>
  );
}

// Minimal chunk-failure recovery: a stale PWA chunk after deploy would
// otherwise hang on "Loading…" forever (review: PerfReviewer).
class RouteErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground" role="alert">
          <p>This page failed to load. A new version may be available.</p>
          <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground min-h-[44px]">
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
function App() {
  useEffect(() => {
    let reloading = false;
    const handleUpdate = (e) => {
      const registration = e.detail;
      toast('New version of Fyndr is available', {
        id: 'pwa-update',
        description: 'Update now for the latest performance improvements.',
        duration: Infinity,
        cancel: { label: 'Later' },
        action: {
          label: 'Reload',
          onClick: () => {
            if (reloading) return;
            reloading = true;
            const waiting = registration && registration.waiting;
            if (waiting && 'serviceWorker' in navigator) {
              let timer = 0;
              let settled = false;
              const doReload = () => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                window.location.reload();
              };
              // The new worker takes control async — reload only once it has.
              navigator.serviceWorker.addEventListener('controllerchange', doReload, { once: true });
              waiting.postMessage({ type: 'SKIP_WAITING' });
              // Fallback in case activation fails.
              timer = window.setTimeout(doReload, 3000);
            } else {
              window.location.reload();
            }
          },
        },
      });
    };

    window.addEventListener('pwa-update-available', handleUpdate);
    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, []);

  return (
    <div className="App min-h-screen bg-background text-foreground">
      <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <BottomNav />
        <PWAOfflineIndicator />
        <PWAInstallBanner />

        <RouteErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/forgetpassword' element={<ForgetPass/>}/>
          <Route path='/confirmed' element={<ConfirmVerify/>}/>
          <Route path="/emailverified" element={<EmailVerified />} />
          <Route path='/camera' element={<CameraCaptureWithMask/>}/>
          <Route path='/reel/:eventId' element={<ReelPage />} />
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/events' element={<Dashboard />} />
          <Route path='/create-event' element={<CreateEventPage />} />
          <Route path='/analytics' element={<AnalyticsPage />} />
          <Route path='/settings' element={<SettingsPage />} />
          <Route path='/account' element={<AccountPage />} />
          <Route path='/collect/:eventId' element={<CollectEvent />} />
          <Route path='/select/:eventId' element={<SelectEvent />} />
          <Route path='/events/:eventId/analytics' element={<GuestAnalyticsPage />} />
          <Route path='/event/:eventId/analytics' element={<GuestAnalyticsPage />} />
          <Route path='/login' element={<LoginRegister />} />
          <Route path='/about' element={<About />} />
        </Routes>
        </Suspense>
        </RouteErrorBoundary>

      </BrowserRouter>
      </ThemeProvider>
        <Toaster />
    </div>
  );
}

export default App;
