import { Appointment, WorkingHour, BlockedDay, Interval } from './types';

export const getAvailableSlots = (
    date: string,
    serviceDuration: number,
    workingHours: WorkingHour | undefined,
    appointments: { appointment_time: string; duration: number; status: string }[],
    blockedDays: BlockedDay[]
): string[] => {
    // 1. Check if date is blocked or working hours inactive
    const isBlocked = blockedDays.some(bd => bd.blocked_date === date);
    if (isBlocked || !workingHours || workingHours.active === false) {
        return [];
    }

    const slots: string[] = [];
    const step = 30; // 30 minutes step

    // Convert time string "HH:mm" to minutes from midnight
    const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Convert minutes to time string "HH:mm"
    const minutesToTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const startMinutes = timeToMinutes(workingHours.start_time);
    const endMinutes = timeToMinutes(workingHours.end_time);

    // iterate through the day with the step
    for (let current = startMinutes; current + serviceDuration <= endMinutes; current += step) {
        const slotStart = current;
        const slotEnd = current + serviceDuration;

        // 2. Check if slot falls clearly within ANY of the working intervals
        // We treat intervals as "Allow Lists" (Working Shifts) rather than "Block Lists" (Breaks)
        // This aligns with the ManageHours UI where users define "8:00 to 12:00" and "13:00 to 18:00"
        const isWithinWorkingShift = workingHours.intervals.some(interval => {
            const intStart = timeToMinutes(interval.start);
            const intEnd = timeToMinutes(interval.end);
            return slotStart >= intStart && slotEnd <= intEnd;
        });

        if (!isWithinWorkingShift) continue;

        // 3. Check overlap with existing appointments
        const overlapsAppointment = appointments.some(app => {
            // Only consider confirmed or pending appointments
            if (['cancelled_client', 'cancelled_barber'].includes(app.status)) return false;

            const appStart = timeToMinutes(app.appointment_time);
            const appEnd = appStart + app.duration;

            return slotStart < appEnd && slotEnd > appStart;
        });

        if (overlapsAppointment) continue;

        slots.push(minutesToTime(current));
    }

    return slots;
};
