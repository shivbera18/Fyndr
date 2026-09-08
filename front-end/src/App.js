import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { toast } from 'sonner';

import { ThemeProvider } from './component/landing/Theme';
import { Toaster } from './components/ui/sonner';
import CollectEvent from './component/collect_images/Collect_event';
import SelectEvent from './component/select/Select_event';
import Home from './component/home/Home';
import About from './component/About';
import LoginRegister from './component/login/Login_Register';
import Dashboard from './component/dashboard/Dashboard';
import CameraCaptureWithMask from './component/collect_images/CameraCaptureWithMask';
import EmailVerified from './component/login/EmailVerify';
import ConfirmVerify from './component/login/ConfirmVerify';
import ForgetPass from './component/login/ForgetPass';
import CreateEventPage from './component/dashboard/CreateEventPage';
import AnalyticsPage from './component/dashboard/AnalyticsPage';
import SettingsPage from './component/dashboard/SettingsPage';
import BottomNav from './component/navbar/BottomNav';
import AccountPage from './component/dashboard/AccountPage';
import { PWAInstallBanner, PWAOfflineIndicator } from './components/pwa';
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
        <BottomNav />
        <PWAOfflineIndicator />
        <PWAInstallBanner />







        <Routes>

          <Route path='/' element={< Home />} />
          <Route path='/forgetpassword' element={<ForgetPass/>}/>
          <Route path='/confirmed' element={<ConfirmVerify/>}/>
          <Route path="/emailverified" element={<EmailVerified />} />
          <Route path='/camera' element={<CameraCaptureWithMask/>}/>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/events' element={<Dashboard />} />
          <Route path='/create-event' element={<CreateEventPage />} />
          <Route path='/analytics' element={<AnalyticsPage />} />
          <Route path='/settings' element={<SettingsPage />} />
          <Route path='/account' element={<AccountPage />} />
          <Route path='/collect/:eventId' element={<CollectEvent />} />
          <Route path='/select/:eventId' element={<SelectEvent />} />
          <Route path='/login' element={<LoginRegister />} />
          <Route path='/about' element={<About />} />

        </Routes>


      </BrowserRouter>
      </ThemeProvider>
        <Toaster />
    </div>
  );
}

export default App;
