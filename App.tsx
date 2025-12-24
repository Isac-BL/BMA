import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, Service } from './types.ts';
import { supabase } from './supabase.ts';
import Landing from './pages/Landing.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import ClientDashboard from './pages/ClientDashboard.tsx';
import ServiceSelection from './pages/ServiceSelection.tsx';
import ScheduleSelection from './pages/ScheduleSelection.tsx';
import Confirmation from './pages/Confirmation.tsx';
import BarberDashboard from './pages/BarberDashboard.tsx';
import BarberSchedule from './pages/BarberSchedule.tsx';
import BarberFinances from './pages/BarberFinances.tsx';
import ManageServices from './pages/ManageServices.tsx';
import ManageHours from './pages/ManageHours.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [bookingState, setBookingState] = useState<{
    service: Service | null;
    barber: User | null;
    date: string | null;
    time: string | null;
  }>({
    service: null,
    barber: null,
    date: null,
    time: null,
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Profile not found, user might be new.');
          setUser({ id, name: 'Novo Usuário', email, role: UserRole.CLIENT });
        } else {
          throw error;
        }
      } else {
        setUser({
          id: data.id,
          name: data.name || 'Usuário',
          email: email,
          role: data.role as UserRole,
          avatar: data.avatar_url
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login/:role" element={<Login />} />
          <Route path="/signup/:role" element={<Signup />} />

          <Route
            path="/client/*"
            element={user?.role === UserRole.CLIENT ? (
              <Routes>
                <Route index element={<ClientDashboard user={user} onLogout={handleLogout} />} />
                <Route path="book/services" element={<ServiceSelection setBookingState={setBookingState} bookingState={bookingState} />} />
                <Route path="book/schedule" element={<ScheduleSelection setBookingState={setBookingState} bookingState={bookingState} />} />
                <Route path="book/confirm" element={<Confirmation bookingState={bookingState} user={user} />} />
              </Routes>
            ) : <Navigate to="/" />}
          />

          <Route
            path="/barber/*"
            element={user?.role === UserRole.BARBER ? (
              <Routes>
                <Route index element={<BarberDashboard user={user} onLogout={handleLogout} />} />
                <Route path="schedule" element={<BarberSchedule user={user!} onLogout={handleLogout} />} />
                <Route path="finances" element={<BarberFinances user={user!} onLogout={handleLogout} />} />
                <Route path="services" element={<ManageServices user={user!} onLogout={handleLogout} />} />
                <Route path="hours" element={<ManageHours user={user!} onLogout={handleLogout} />} />
              </Routes>
            ) : <Navigate to="/" />}
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
