
export enum UserRole {
  CLIENT = 'CLIENT',
  BARBER = 'BARBER'
}

export interface Service {
  id?: string;
  name: string;
  duration: number; // in minutes
  price: number;
  barber_id?: string;
}

export interface Interval {
  id?: string;
  name?: string;
  start: string; // HH:mm
  end: string;
}

export interface WorkingHour {
  id: string;
  barber_id: string;
  day_of_week: number; // 0-6
  start_time: string; // HH:mm
  end_time: string;
  intervals: Interval[];
  active?: boolean;
}

export interface BlockedDay {
  id: string;
  barber_id: string;
  blocked_date: string; // YYYY-MM-DD
  reason?: string;
}

export interface AppointmentService {
  service: Service;
}

export interface Appointment {
  id: string;
  client_id: string;
  barber_id: string;
  service_id?: string; // Legacy
  client_name?: string; // For manual/guest bookings
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:mm
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled_client' | 'cancelled_barber';
  value: string | number;
  client?: { name: string; avatar_url?: string };
  barber?: { name: string, avatar_url?: string, role?: string, email?: string };
  appointment_services?: AppointmentService[];
  services_list?: Service[];
  display_services?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  avatar_pos_x?: number;
  avatar_pos_y?: number;
  avatar_zoom?: number;
}

export interface BookingState {
  services: Service[];
  barber: User | null;
  date: string | null;
  time: string | null;
  rescheduleAppointmentId?: string | null;
  guestName?: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  appointment_id?: string;
  type: 'confirmation' | 'cancellation' | 'reminder' | 'update';
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}
