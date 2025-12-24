
export enum UserRole {
  CLIENT = 'CLIENT',
  BARBER = 'BARBER'
}

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
}

export interface Interval {
  id: string;
  name: string;
  start: string; // HH:mm
  end: string;
}

export interface WorkingHour {
  id: string;
  barberId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string;
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
  clientId: string;
  barberId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled_client' | 'cancelled_barber';
  value: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}
