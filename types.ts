
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
  id: string;
  name: string;
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
}

export interface BlockedDay {
  id: string;
  barber_id: string;
  blocked_date: string; // YYYY-MM-DD
  reason?: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  barber_id: string;
  service_id?: string; // Legacy
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:mm
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled_client' | 'cancelled_barber';
  value: string | number;
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
