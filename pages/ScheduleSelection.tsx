
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase.ts';
import { User, Service, WorkingHour, BlockedDay, Interval, BookingState, UserRole } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import { getAvailableSlots as calculateSlots } from '../scheduler.ts'; // Import from scheduler
import BarberNavigation from '../components/BarberNavigation.tsx';

interface ScheduleSelectionProps {
  bookingState: BookingState;
  setBookingState: (state: BookingState) => void;
}

const ScheduleSelection: React.FC<ScheduleSelectionProps> = ({ bookingState, setBookingState }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [barbers, setBarbers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [workingHoursMap, setWorkingHoursMap] = useState<Record<number, boolean>>({});

  const totalDuration = useMemo(() => {
    return bookingState.services.reduce((acc, s) => acc + s.duration, 0);
  }, [bookingState.services]);

  const totalPrice = useMemo(() => {
    return bookingState.services.reduce((acc, s) => acc + s.price, 0);
  }, [bookingState.services]);

  // Generate next 14 days, plus the reschedule date if provided and not within the range
  const dates = useMemo(() => {
    const d = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      d.push({
        full: dateStr,
        day: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
        num: date.getDate().toString(),
        dayOfWeek: date.getDay()
      });
    }
    // If rescheduling, ensure the original appointment date is present
    if (bookingState && bookingState.date) {
      const exists = d.some(item => item.full === bookingState.date);
      if (!exists) {
        const date = new Date(bookingState.date);
        d.unshift({
          full: date.toISOString().split('T')[0],
          day: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
          num: date.getDate().toString(),
          dayOfWeek: date.getDay()
        });
      }
    }
    return d;
  }, [bookingState.date]);

  const [selectedDate, setSelectedDate] = useState(bookingState?.date || dates[0].full);

  // If coming from a reschedule flow, initialize the selected date from bookingState
  useEffect(() => {
    if (bookingState && bookingState.date) {
      setSelectedDate(bookingState.date);
    }
  }, [bookingState.date]);

  useEffect(() => {
    fetchBarbers();
  }, []);

  useEffect(() => {
    if (bookingState.barber) {
      fetchWorkingHours(bookingState.barber.id);
    }
  }, [bookingState.barber]);

  useEffect(() => {
    if (bookingState.barber && selectedDate && bookingState.services.length > 0) {
      calculateAvailability();

      // Real-time updates
      const appointmentsChannel = supabase
        .channel('availability_appointments')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'appointments', filter: `barber_id=eq.${bookingState.barber.id}` },
          () => calculateAvailability()
        )
        .subscribe();

      const servicesChannel = supabase
        .channel('availability_services')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'appointment_services' },
          () => calculateAvailability()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(appointmentsChannel);
        supabase.removeChannel(servicesChannel);
      };
    }
  }, [bookingState.barber, selectedDate, bookingState.services.length]);

  const fetchWorkingHours = async (barberId: string) => {
    const { data } = await supabase
      .from('working_hours')
      .select('day_of_week, active, intervals, start_time, end_time')
      .eq('barber_id', barberId);

    const map: Record<number, boolean> = {};
    if (data) {
      data.forEach(wh => {
        map[wh.day_of_week] = wh.active ?? true;
      });
    }
    setWorkingHoursMap(map);
  };

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'BARBER');

      if (error) throw error;

      const mapped = data.map(b => ({
        id: b.id,
        name: b.name,
        email: '',
        role: b.role as UserRole,
        avatar: b.avatar_url
      }));
      setBarbers(mapped);

      if (!bookingState.barber && mapped.length > 0) {
        setBookingState({ ...bookingState, barber: mapped[0] });
      }
    } catch (err) {
      console.error('Error fetching barbers:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAvailability = async () => {
    setLoadingSlots(true);
    try {
      if (!bookingState.barber || !selectedDate) return;

      const barberId = bookingState.barber.id;
      const jsDay = new Date(selectedDate + 'T12:00:00').getDay();
      const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

      const appointmentsQuery = supabase.from('appointments')
        .select(`
          id,
          appointment_time,
          status,
          appointment_services(service:service_id(duration))
        `)
        .eq('barber_id', barberId)
        .eq('appointment_date', selectedDate)
        .not('status', 'ilike', 'cancelled%');

      if (bookingState.rescheduleAppointmentId) {
        appointmentsQuery.neq('id', bookingState.rescheduleAppointmentId);
      }

      const [whRes, blockedRes, appRes] = await Promise.all([
        supabase.from('working_hours').select('*').eq('barber_id', barberId).eq('day_of_week', dayOfWeek).single(),
        supabase.from('blocked_days').select('*').eq('barber_id', barberId).eq('blocked_date', selectedDate),
        appointmentsQuery
      ]);

      if (blockedRes.data?.length || whRes.error || !whRes.data) {
        setAvailableSlots([]);
        return;
      }

      const existingAppointments = (appRes.data || []).map(app => {
        let totalAppDuration = 0;
        const services = app.appointment_services;

        if (Array.isArray(services)) {
          services.forEach((s) => {
            const service = (Array.isArray(s.service) ? s.service[0] : s.service) as { duration: number } | undefined;
            totalAppDuration += (service?.duration || 0);
          });
        }
        if (totalAppDuration === 0) totalAppDuration = 30;

        return {
          appointment_time: app.appointment_time,
          duration: totalAppDuration,
          status: app.status
        };
      });

      // Pass the workingHours data (which includes active) to the scheduler
      const slots = calculateSlots(
        selectedDate,
        totalDuration,
        whRes.data,

        existingAppointments,
        blockedRes.data || []
      );

      // Filter past slots if today
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayLocal = `${year}-${month}-${day}`;

      if (selectedDate === todayLocal) {
        const currentMin = now.getHours() * 60 + now.getMinutes();
        const filtered = slots.filter(s => {
          const [h, m] = s.split(':').map(Number);
          return (h * 60 + m) >= currentMin; // Real-time onwards (no buffer for barbers/clients)
        });
        setAvailableSlots(filtered);
      } else {
        setAvailableSlots(slots);
      }

    } catch (err) {
      console.error('Error calculating availability:', err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectBarber = (barber: User) => {
    setBookingState({ ...bookingState, barber, time: null });
  };

  const handleSelectTime = (time: string) => {
    setBookingState({ ...bookingState, time, date: selectedDate });
  };

  const handleContinue = () => {
    if (bookingState.barber && bookingState.time && bookingState.date) {
      const isBarber = bookingState.barber.role === 'BARBER' || barbers.find(b => b.id === bookingState.barber.id)?.role === 'BARBER';
      // Use the context of the current route instead of a hardcoded /client/
      const basePath = location.pathname.includes('/barber/') ? '/barber/book' : '/client/book';
      navigate(`${basePath}/confirm`);
    }
  };

  const categorizedSlots = useMemo(() => {
    const morning = availableSlots.filter(t => {
      const h = parseInt(t.split(':')[0]);
      return h < 12;
    });
    const afternoon = availableSlots.filter(t => {
      const h = parseInt(t.split(':')[0]);
      return h >= 12 && h < 18;
    });
    const night = availableSlots.filter(t => {
      const h = parseInt(t.split(':')[0]);
      return h >= 18;
    });
    return { morning, afternoon, night };
  }, [availableSlots]);

  if (loading) {
    return (
      <div className="bg-background-dark min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col pb-40 max-w-md mx-auto bg-background-dark text-white font-display overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-background-dark/80 backdrop-blur-xl p-4 pb-2 justify-between border-b border-white/5 will-change-transform">
        <button
          onClick={() => navigate(-1)}
          className="size-11 flex items-center justify-center rounded-2xl bg-white/5 text-white/60 hover:text-white transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-black tracking-tight leading-tight">Escolha o Horário</h2>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Barbearia Mateus Andrade</span>
        </div>
        <div className="w-11"></div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        {/* Progress Bar */}
        <div className="flex flex-col w-full items-center justify-center gap-2 py-6">
          <div className="flex flex-row items-center gap-3">
            <div className="h-1.5 w-8 rounded-full bg-primary/20"></div>
            <div className="h-1.5 w-8 rounded-full bg-primary shadow-gold"></div>
            <div className="h-1.5 w-8 rounded-full bg-white/5"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Passo 2 de 3</p>
        </div>

        {/* Barbers Selection */}
        <section className="flex flex-col w-full px-6">
          <h3 className="text-sm font-black uppercase tracking-[0.15em] text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">content_cut</span>
            Profissional
          </h3>
          <div className="flex w-full overflow-x-auto no-scrollbar gap-5 pb-2">
            {barbers.map(b => {
              const isSelected = bookingState.barber?.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => handleSelectBarber(b)}
                  className="flex flex-col items-center gap-2 cursor-pointer group shrink-0"
                >
                  <div
                    className={`w-[72px] h-[72px] rounded-full border-2 overflow-hidden transition-all duration-300 relative ${isSelected ? 'border-primary ring-4 ring-primary/20 scale-110 shadow-gold' : 'border-white/5 opacity-40 group-hover:opacity-70 grayscale'}`}
                  >
                    <img
                      src={b.avatar || 'https://ih1.redbubble.net/image.1024340084.6729/flat,750x,075,f-pad,750x1000,f8f8f8.jpg'}
                      alt={b.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 z-10 size-6 bg-primary rounded-full border-2 border-background-dark flex items-center justify-center">
                        <span className="material-symbols-outlined text-background-dark text-sm font-black">check</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white' : 'text-white/30'}`}>{b.name.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Calendar */}
        <section className="flex flex-col w-full px-6 mt-8">
          <h3 className="text-sm font-black uppercase tracking-[0.15em] text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">event</span>
            Data
          </h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {dates.map((d, idx) => {
              const isSelected = selectedDate === d.full;
              const jsDay = d.dayOfWeek;
              const dbDay = jsDay === 0 ? 6 : jsDay - 1;
              const isActive = workingHoursMap[dbDay] !== false; // Default to true if not loaded yet or undefined

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (isActive) {
                      setSelectedDate(d.full);
                      setBookingState({ ...bookingState, time: null });
                    }
                  }}
                  disabled={!isActive}
                  className={`flex flex-col items-center justify-center min-w-[70px] h-24 rounded-[2rem] transition-all duration-300 ${!isActive
                    ? 'opacity-20 cursor-not-allowed grayscale bg-surface-dark border border-white/5'
                    : isSelected
                      ? 'bg-primary text-background-dark shadow-gold scale-105 border-transparent'
                      : 'bg-surface-dark text-white border border-white/5 hover:bg-surface-highlight opacity-50'
                    }`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-background-dark/60' : 'text-white/40'}`}>{d.day}</span>
                  <span className="text-2xl font-black">{d.num}</span>
                  {isSelected && <div className="size-1.5 bg-background-dark rounded-full mt-1"></div>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Time Slots organized by Period */}
        <section className="px-6 mt-10 pb-32">
          <h3 className="text-sm font-black uppercase tracking-[0.15em] text-primary mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">schedule</span>
            Horário
          </h3>

          {loadingSlots ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
              <p className="text-[10px] font-black uppercase tracking-widest">Calculando disponibilidade...</p>
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="space-y-8">
              {/* Manhã */}
              {categorizedSlots.morning.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-amber-400 text-lg">light_mode</span>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Manhã</h4>
                    <div className="flex-1 h-px bg-white/5"></div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {categorizedSlots.morning.map(time => (
                      <button
                        key={time}
                        onClick={() => handleSelectTime(time)}
                        className={`py-3.5 rounded-2xl text-xs font-black transition-all duration-300 border ${bookingState.time === time ? 'bg-primary border-primary text-background-dark shadow-gold scale-[1.05]' : 'bg-surface-dark border-white/5 text-white hover:bg-surface-highlight'}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tarde */}
              {categorizedSlots.afternoon.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-orange-400 text-lg">wb_sunny</span>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Tarde</h4>
                    <div className="flex-1 h-px bg-white/5"></div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {categorizedSlots.afternoon.map(time => (
                      <button
                        key={time}
                        onClick={() => handleSelectTime(time)}
                        className={`py-3.5 rounded-2xl text-xs font-black transition-all duration-300 border ${bookingState.time === time ? 'bg-primary border-primary text-background-dark shadow-gold scale-[1.05]' : 'bg-surface-dark border-white/5 text-white hover:bg-surface-highlight'}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Noite */}
              {categorizedSlots.night.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-blue-400 text-lg">dark_mode</span>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Noite</h4>
                    <div className="flex-1 h-px bg-white/5"></div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {categorizedSlots.night.map(time => (
                      <button
                        key={time}
                        onClick={() => handleSelectTime(time)}
                        className={`py-3.5 rounded-2xl text-xs font-black transition-all duration-300 border ${bookingState.time === time ? 'bg-primary border-primary text-background-dark shadow-gold scale-[1.05]' : 'bg-surface-dark border-white/5 text-white hover:bg-surface-highlight'}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface-dark/40 rounded-[2.5rem] border border-dashed border-white/10 p-12 text-center animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-white/20">event_busy</span>
              </div>
              <p className="text-white font-bold mb-1">Agenda Lotada</p>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Tente outro dia ou barbeiro</p>
            </div>
          )}
        </section>
      </main>

      {/* Floating Resume / Action Button */}
      <footer className="fixed bottom-0 w-full p-6 pb-10 z-[60] pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-surface-dark/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-5 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-primary text-2xl font-black tracking-tight">{formatCurrency(totalPrice)}</span>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
                <span className="material-symbols-outlined text-sm">history</span>
                {totalDuration} minutos
              </div>
            </div>

            <button
              onClick={handleContinue}
              disabled={!bookingState.barber || !bookingState.time || !bookingState.date}
              className={`h-16 px-8 rounded-2xl transition-all flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] ${bookingState.barber && bookingState.time && bookingState.date ? 'bg-primary text-background-dark shadow-gold active:scale-95' : 'bg-white/5 text-white/20 cursor-not-allowed opacity-50'}`}
            >
              Confirmar
              <span className="material-symbols-outlined font-black">arrow_forward</span>
            </button>
          </div>
        </div>
      </footer>
      {location.pathname.includes('/barber/') && <BarberNavigation />}
    </div>
  );
};

export default ScheduleSelection;
