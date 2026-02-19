import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react"
import { User, UserRole, Service, BookingState } from './types.ts';
import { supabase } from './supabase.ts';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import PublicRoute from './components/PublicRoute.tsx';
import { PWAInstallPrompt } from './components/PWAInstallPrompt.tsx';

// Eager load public pages for better performance/UX
import Landing from './pages/Landing.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';

// Lazy load protected pages
const ClientHome = lazy(() => import('./pages/ClientHome.tsx'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard.tsx'));
const ServiceSelection = lazy(() => import('./pages/ServiceSelection.tsx'));
const ScheduleSelection = lazy(() => import('./pages/ScheduleSelection.tsx'));
const Confirmation = lazy(() => import('./pages/Confirmation.tsx'));
const BarberDashboard = lazy(() => import('./pages/BarberDashboard.tsx'));
const BarberSchedule = lazy(() => import('./pages/BarberSchedule.tsx'));
const BarberFinances = lazy(() => import('./pages/BarberFinances.tsx'));
const ManageServices = lazy(() => import('./pages/ManageServices.tsx'));
const ManageHours = lazy(() => import('./pages/ManageHours.tsx'));
const Profile = lazy(() => import('./pages/Profile.tsx'));

const LoadingSpinner = () => (
  <div className="bg-background-dark min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [bookingState, setBookingState] = useState<BookingState>({
    services: [],
    barber: null,
    date: null,
    time: null,
    rescheduleAppointmentId: null,
    guestName: '',
  });

  useEffect(() => {
    let mounted = true;

    // Check current session
    const checkSession = async () => {
      try {
        // Add a timeout to prevent infinite loading
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 5000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        if (session && mounted) {
          // We have a session, fetch profile
          await fetchProfile(session.user.id, session.user.email!);
        } else if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Session check failed", error);
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await fetchProfile(session.user.id, session.user.email!);
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sync profile changes across devices
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile_sync:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        () => {
          if (user.email) fetchProfile(user.id, user.email);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchProfile = async (id: string, email: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const metadata = session?.user?.user_metadata || {};

      // Timeout for profile fetch
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      const timeoutPromise = new Promise<{ data: Record<string, any> | null; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout fetching profile')), 5000)
      );

      let data, error;
      try {
        const result = await Promise.race([profilePromise, timeoutPromise]);
        data = result.data;
        error = result.error;
      } catch (e) {
        console.warn('Profile fetch timed out, falling back to metadata');
        error = { code: 'TIMEOUT' };
      }

      if (error) {
        // If profile missing or timeout, use metadata
        console.warn('Profile not found or error, using session metadata.', error);
        setUser({
          id,
          name: metadata.name || 'Usuário',
          email: email,
          role: (metadata.role as UserRole) || UserRole.CLIENT,
          avatar: metadata.avatar_url
        });
      } else {
        setUser({
          id: data.id,
          name: data.name || metadata.name || 'Usuário',
          email: email,
          role: (data.role || metadata.role) as UserRole,
          avatar: data.avatar_url || metadata.avatar_url,
          avatar_pos_x: data.avatar_pos_x,
          avatar_pos_y: data.avatar_pos_y,
          avatar_zoom: data.avatar_zoom
        });
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      // Fallback
      setUser({
        id,
        name: 'Usuário',
        email: email,
        role: UserRole.CLIENT,
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetchProfile(session.user.id, session.user.email!);
    }
  };

  const handleLogout = async () => {
    setUser(null);
    await supabase.auth.signOut();
  };

  if (loading && window.location.hash !== '' && window.location.hash !== '#/') {
    // Only show spinner for deep links to avoid flashing unauthorized or empty dashboards
    return (
      <div className="bg-background-dark min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="bg-background-dark min-h-screen text-white font-display overflow-x-hidden">
        <SpeedInsights />
        <PWAInstallPrompt />
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route
              path="/"
              element={
                <PublicRoute user={user}>
                  <Landing />
                </PublicRoute>
              }
            />
            <Route
              path="/login/:role"
              element={
                <PublicRoute user={user}>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/signup/:role"
              element={
                <PublicRoute user={user}>
                  <Signup />
                </PublicRoute>
              }
            />

            <Route
              path="/client/*"
              element={
                <ProtectedRoute user={user} allowedRoles={[UserRole.CLIENT, UserRole.BARBER]}>
                  <Routes>
                    <Route index element={<ClientHome user={user} onLogout={handleLogout} />} />
                    <Route path="appointments" element={<ClientDashboard user={user} onLogout={handleLogout} setBookingState={setBookingState} />} />
                    <Route path="profile" element={<Profile user={user} onUpdate={refreshProfile} onLogout={handleLogout} />} />
                    <Route path="book/services" element={<ServiceSelection setBookingState={setBookingState} bookingState={bookingState} user={user!} />} />
                    <Route path="book/schedule" element={<ScheduleSelection setBookingState={setBookingState} bookingState={bookingState} />} />
                    <Route path="book/confirm" element={<Confirmation bookingState={bookingState} user={user} />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            <Route
              path="/barber/*"
              element={
                <ProtectedRoute user={user} allowedRoles={[UserRole.BARBER]}>
                  <Routes>
                    <Route index element={<BarberDashboard user={user} onLogout={handleLogout} setBookingState={setBookingState} />} />
                    <Route path="schedule" element={<BarberSchedule user={user!} onLogout={handleLogout} setBookingState={setBookingState} />} />
                    <Route path="finances" element={<BarberFinances user={user!} onLogout={handleLogout} />} />
                    <Route path="services" element={<ManageServices user={user!} onLogout={handleLogout} />} />
                    <Route path="hours" element={<ManageHours user={user!} onLogout={handleLogout} />} />
                    <Route path="profile" element={<Profile user={user!} onUpdate={refreshProfile} onLogout={handleLogout} />} />
                    {/* Manual Booking Flow for Barbers */}
                    <Route path="book/services" element={<ServiceSelection setBookingState={setBookingState} bookingState={bookingState} user={user!} />} />
                    <Route path="book/schedule" element={<ScheduleSelection setBookingState={setBookingState} bookingState={bookingState} />} />
                    <Route path="book/confirm" element={<Confirmation bookingState={bookingState} user={user!} />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </div>
    </HashRouter>
  );
};

export default App;
