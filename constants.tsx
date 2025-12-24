
import { Service, Barber } from './types.ts';

export const SERVICES: Service[] = [
  {
    id: '1',
    name: 'Corte Degradê',
    duration: 45,
    price: 50,
    description: 'Técnica detalhada de transição moderna',
    icon: 'content_cut',
    category: 'Cabelo'
  },
  {
    id: '2',
    name: 'Barba Modelada',
    duration: 30,
    price: 35,
    description: 'Navalha, toalha quente e óleos essenciais',
    icon: 'face',
    category: 'Barba'
  },
  {
    id: '3',
    name: 'Combo Executivo',
    duration: 75,
    price: 75,
    description: 'Cabelo, Barba e Sobrancelha com finalização',
    icon: 'diamond',
    category: 'Popular'
  },
  {
    id: '4',
    name: 'Pigmentação',
    duration: 25,
    price: 40,
    description: 'Cobertura de falhas com aspecto natural',
    icon: 'palette',
    category: 'Extra'
  }
];

export const BARBERS: Barber[] = [
  {
    id: 'b1',
    name: 'Mateus Andrade',
    role: 'Master Barber',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1503460293346-3c5a3fd24c2a?auto=format&fit=crop&q=80&w=256&h=256'
  },
  {
    id: 'b2',
    name: 'João Silva',
    role: 'Especialista em Barba',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1583327311174-8973d096472d?auto=format&fit=crop&q=80&w=256&h=256'
  },
  {
    id: 'b3',
    name: 'Lucas Martins',
    role: 'Designer de Corte',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1618077360395-f3068be8e001?auto=format&fit=crop&q=80&w=256&h=256'
  }
];
