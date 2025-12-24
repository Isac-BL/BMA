import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.ts';
import { User, Service, WorkingHour, BlockedDay, Interval } from '../types.ts';

interface ScheduleSelectionProps {
  bookingState: {
    service: Service | null;
    barber: User | null;
    date: string | null;
    time: string | null;
  };
  setBookingState: (state: any) => void;
}

const ScheduleSelection: React.FC<ScheduleSelectionProps> = ({ bookingState, setBookingState }) => {
  const navigate = useNavigate();
  const [barbers, setBarbers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Generate next 14 days
  const dates = useMemo(() => {
    const d = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      d.push({
        full: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        num: date.getDate().toString(),
        dayOfWeek: date.getDay()
      });
    }
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState(dates[0].full);

  useEffect(() => {
    fetchBarbers();
  }, []);

  useEffect(() => {
    if (bookingState.barber && selectedDate && bookingState.service) {
      calculateAvailability();
    }
  }, [bookingState.barber, selectedDate, bookingState.service]);

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
        email: '', // Not needed for selection
        role: b.role,
        avatar: b.avatar_url
      }));
      setBarbers(mapped);

      // Auto-select first barber if none selected
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
      const barberId = bookingState.barber!.id;
      const dayOfWeek = new Date(selectedDate + 'T12:00:00').getDay();
      const serviceDuration = bookingState.service!.duration;

      // 1. Fetch Working Hours & Blocked Day in parallel
      const [whRes, blockedRes, appRes] = await Promise.all([
        supabase.from('working_hours').select('*').eq('barber_id', barberId).eq('day_of_week', dayOfWeek).single(),
        supabase.from('blocked_days').select('*').eq('barber_id', barberId).eq('blocked_date', selectedDate),
        supabase.from('appointments').select('appointment_time, service_id, services(duration)').eq('barber_id', barberId).eq('appointment_date', selectedDate).neq('status', 'cancelled')
      ]);

      // If blocked or no working hours, no slots
      if (blockedRes.data?.length || whRes.error || !whRes.data) {
        setAvailableSlots([]);
        return;
      }

      const { start_time, end_time, intervals } = whRes.data;
      const existingAppointments = appRes.data || [];

      // HELPER: Convert "HH:mm" to minutes from midnight
      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      // HELPER: Convert minutes to "HH:mm"
      const toStr = (m: number) => {
        const h = Math.floor(m / 60);
        const min = m % 60;
        return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      };

      const startMin = toMin(start_time);
      const endMin = toMin(end_time);
      const durationMin = serviceDuration;

      const slots = [];
      // Generate slots every 30 minutes
      for (let m = startMin; m <= endMin - durationMin; m += 30) {
        const slotStart = m;
        const slotEnd = m + durationMin;

        // Check against end of work day
        if (slotEnd > endMin) continue;

        // Check against intervals (almoço, pausas)
        const inInterval = (intervals as any[])?.some(inv => {
          const invStart = toMin(inv.start);
          const invEnd = toMin(inv.end);
          // Overlap check
          return (slotStart < invEnd && slotEnd > invStart);
        });
        if (inInterval) continue;

        // Check against existing appointments
        // Each appointment blocks [appStart, appStart + appDuration]
        const isBusy = existingAppointments.some(app => {
          const appStart = toMin(app.appointment_time);
          const appDur = (app as any).services?.duration || 30; // Fallback to 30 if joined info fails
          const appEnd = appStart + appDur;
          return (slotStart < appEnd && slotEnd > appStart);
        });
        if (isBusy) continue;

        slots.push(toStr(slotStart));
      }

      setAvailableSlots(slots);
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
      navigate('/client/book/confirm');
    }
  };

  if (loading) {
    return (
      <div className="bg-background-dark min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col pb-32 max-w-md mx-auto bg-background-dark">
      <div className="sticky top-0 z-50 flex items-center bg-background-dark p-4 pb-2 justify-between border-b border-white/5">
        <div
          onClick={() => navigate('/client/book/services')}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </div>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">Agendamento</h2>
      </div>

      <div className="flex w-full flex-col items-center justify-center gap-2 py-6">
        <div className="flex flex-row items-center gap-3">
          <div className="h-1.5 w-8 rounded-full bg-primary/40"></div>
          <div className="h-1.5 w-8 rounded-full bg-primary"></div>
          <div className="h-1.5 w-8 rounded-full bg-white/20"></div>
        </div>
        <p className="text-xs font-medium text-white/50">Passo 2 de 3</p>
      </div>

      {/* Barber Selection */}
      <div className="flex flex-col w-full px-6">
        <h3 className="tracking-tight text-xl font-bold leading-tight pb-4">Profissional</h3>
        <div className="flex w-full overflow-x-auto no-scrollbar gap-6">
          {barbers.map(b => {
            const isSelected = bookingState.barber?.id === b.id;
            return (
              <div
                key={b.id}
                onClick={() => handleSelectBarber(b)}
                className={`flex flex-col items-center gap-2 cursor-pointer transition-all ${isSelected ? 'opacity-100' : 'opacity-40'}`}
              >
                <div
                  className={`w-16 h-16 rounded-full border-2 bg-cover bg-center transition-all ${isSelected ? 'border-primary ring-4 ring-primary/20 scale-105' : 'border-transparent'}`}
                  style={{ backgroundImage: `url(${b.avatar || 'https://ih1.redbubble.net/image.1024340084.6729/flat,750x,075,f-pad,750x1000,f8f8f8.jpg'})` }}
                ></div>
                <span className="text-xs text-white font-bold">{b.name.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-8"></div>

      {/* Date Selection */}
      <div className="flex flex-col w-full px-6">
        <h3 className="tracking-tight text-xl font-bold leading-tight pb-4">Data</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {dates.map((d, idx) => {
            const isSelected = selectedDate === d.full;
            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedDate(d.full);
                  setBookingState({ ...bookingState, time: null });
                }}
                className={`flex flex-col items-center justify-center min-w-[64px] h-20 rounded-2xl transition-all cursor-pointer ${isSelected ? 'bg-primary text-background-dark shadow-gold scale-105' : 'bg-surface-dark text-white opacity-60 hover:opacity-100 hover:border-white/10 border border-transparent'}`}
              >
                <span className="text-[10px] uppercase font-black tracking-widest mb-1">{d.day}</span>
                <span className="text-2xl font-black">{d.num}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-8"></div>

      {/* Time Selection */}
      <div className="px-6 pb-20">
        <h3 className="tracking-tight text-xl font-bold leading-tight pb-4">Horário</h3>
        {loadingSlots ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary/50"></div>
          </div>
        ) : availableSlots.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {availableSlots.map(time => (
              <button
                key={time}
                onClick={() => handleSelectTime(time)}
                className={`py-3 rounded-xl text-sm font-bold border transition-all ${bookingState.time === time ? 'bg-primary border-primary text-background-dark shadow-glow' : 'bg-surface-dark border-white/5 text-white hover:border-primary/50'}`}
              >
                {time}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-surface-dark/30 rounded-2xl border border-dashed border-white/5 p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-white/10 mb-2">event_busy</span>
            <p className="text-white/40 text-sm">Nenhum horário disponível para este dia.</p>
          </div>
        )}
      </div>

      {/* Fixed Continue Button */}
      <div className="fixed bottom-0 w-full bg-[#171611]/90 backdrop-blur-xl border-t border-white/10 p-5 pb-8 shadow-[0_-5px_30px_rgba(0,0,0,0.5)] max-w-md mx-auto z-40">
        <button
          onClick={handleContinue}
          disabled={!bookingState.barber || !bookingState.time || !bookingState.date}
          className={`w-full h-14 text-background-dark text-lg font-bold rounded-xl transition-all flex items-center justify-center gap-3 ${bookingState.barber && bookingState.time && bookingState.date ? 'bg-primary shadow-gold active:scale-[0.98]' : 'bg-surface-highlight opacity-30 grayscale cursor-not-allowed'}`}
        >
          <span>Continuar</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default ScheduleSelection;
