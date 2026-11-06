export type UserRole = 'citizen' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface Specialty {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  professionalCount: number;
  category: 'médica' | 'atendimento_profissional';
}

export interface Professional {
  id: string;
  name: string;
  specialtyId: string;
  specialtyName: string;
  availableDays: string[];
  shifts: ('Manhã' | 'Tarde' | 'Noite')[];
  active: boolean;
  rating: number;
  bioSummary: string;
}

export type AppointmentStatus = 'solicitado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado';

export interface Appointment {
  id: string;
  citizenId: string;
  citizenName: string;
  citizenEmail: string;
  citizenPhone: string;
  professionalId: string;
  professionalName: string;
  specialtyId: string;
  specialtyName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  reason: string;
  notes?: string;
  virtualRoomId: string;
  createdAt: string;
}

export interface DemonstrativeDocument {
  id: string;
  citizenId: string;
  citizenName: string;
  title: string;
  type: 'receita' | 'atestado' | 'orientacao' | 'encaminhamento';
  issuedDate: string;
  doctorName: string;
  specialty: string;
  documentNumber: string;
  content: {
    diagnosisOrSubject: string;
    items?: string[];
    bodyText: string;
    validityDays?: number;
    demonstrativeNotice: string;
  };
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  target: 'telegram' | 'n8n';
  event: string;
  payload: Record<string, unknown>;
  status: 'sent' | 'simulated' | 'error';
  message: string;
}

export interface ChatMessage {
  id: string;
  sender: 'ana' | 'user';
  text: string;
  timestamp: string;
  suggestions?: string[];
}
