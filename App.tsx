import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, Service } from './types.ts';
import { supabase } from './supabase.ts';
import Landing from './pages/Landing.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import ClientHome from './pages/ClientHome.tsx';
import ClientDashboard from './pages/ClientDashboard.tsx';
import ServiceSelection from './pages/ServiceSelection.tsx';
import ScheduleSelection from './pages/ScheduleSelection.tsx';
import Confirmation from './pages/Confirmation.tsx';
import BarberDashboard from './pages/BarberDashboard.tsx';
import BarberSchedule from './pages/BarberSchedule.tsx';
import BarberFinances from './pages/BarberFinances.tsx';
import ManageServices from './pages/ManageServices.tsx';
import ManageHours from './pages/ManageHours.tsx';
import Profile from './pages/Profile.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import PublicRoute from './components/PublicRoute.tsx';
import { PWAInstallPrompt } from './components/PWAInstallPrompt.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [bookingState, setBookingState] = useState<{
    services: Service[];
    barber: User | null;
    date: string | null;
    time: string | null;
    rescheduleAppointmentId?: string | null;
    guestName?: string;
  }>({
    services: [],
    barber: null,
    date: null,
    time: null,
    rescheduleAppointmentId: null,
    guestName: '',
  });

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchProfile(session.user.id, session.user.email!);
      } else {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await fetchProfile(session.user.id, session.user.email!);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (id: string, email: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const metadata = session?.user?.user_metadata || {};

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Profile not found, using session metadata.');
          setUser({
            id,
            name: metadata.name || 'Novo Usuário',
            email: email,
            role: (metadata.role as UserRole) || UserRole.CLIENT,
            avatar: metadata.avatar_url
          });
        } else {
          throw error;
        }
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
      console.error('Error fetching profile:', error);
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

  if (loading) {
    return (
      <div className="bg-background-dark min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="bg-background-dark min-h-screen text-white font-display overflow-x-hidden">
        <PWAInstallPrompt />
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
      </div>
    </HashRouter>
  );
};

export default App;
