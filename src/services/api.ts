import {
  User,
  Specialty,
  Professional,
  Appointment,
  DemonstrativeDocument,
  WebhookLog,
  AppointmentStatus,
} from '../types/index.ts';

export const api = {
  // Auth
  async register(data: { name: string; email: string; phone?: string; password: string }): Promise<{ user: User }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao registrar.');
    }
    return res.json();
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao realizar login.');
    }
    return res.json();
  },

  async resetPassword(email: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao redefinir senha.');
    }
    return res.json();
  },

  // Specialties
  async getSpecialties(): Promise<Specialty[]> {
    const res = await fetch('/api/specialties');
    if (!res.ok) throw new Error('Erro ao carregar especialidades.');
    return res.json();
  },

  // Professionals
  async getProfessionals(specialtyId?: string): Promise<Professional[]> {
    const url = specialtyId ? `/api/professionals?specialtyId=${specialtyId}` : '/api/professionals';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao carregar profissionais.');
    return res.json();
  },

  async updateProfessional(id: string, updates: Partial<Professional>): Promise<Professional> {
    const res = await fetch(`/api/professionals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Erro ao atualizar profissional.');
    return res.json();
  },

  async createProfessional(data: Partial<Professional>): Promise<Professional> {
    const res = await fetch('/api/professionals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao cadastrar profissional.');
    return res.json();
  },

  // Appointments
  async getAppointments(citizenId?: string, role?: string): Promise<Appointment[]> {
    let url = '/api/appointments';
    if (role === 'admin') {
      url += '?role=admin';
    } else if (citizenId) {
      url += `?citizenId=${citizenId}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao buscar agendamentos.');
    return res.json();
  },

  async createAppointment(data: {
    citizenId: string;
    professionalId: string;
    specialtyId: string;
    date: string;
    time: string;
    reason: string;
  }): Promise<Appointment> {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar agendamento.');
    }
    return res.json();
  },

  async updateAppointmentStatus(id: string, status: AppointmentStatus, notes?: string): Promise<Appointment> {
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) throw new Error('Erro ao atualizar status.');
    return res.json();
  },

  // Documents
  async getDocuments(citizenId: string): Promise<DemonstrativeDocument[]> {
    const res = await fetch(`/api/documents?citizenId=${citizenId}`);
    if (!res.ok) throw new Error('Erro ao carregar documentos.');
    return res.json();
  },

  async createDocument(data: Partial<DemonstrativeDocument>): Promise<DemonstrativeDocument> {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao emitir documento.');
    return res.json();
  },

  // SUS ANA Chatbot
  async sendChatMessage(message: string, history: { sender: string; text: string }[]): Promise<{ reply: string }> {
    const res = await fetch('/api/chat/ana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) throw new Error('Erro na comunicação com a assistente.');
    return res.json();
  },

  // Automations & Webhooks
  async getAutomationLogs(): Promise<WebhookLog[]> {
    const res = await fetch('/api/automations/logs');
    if (!res.ok) throw new Error('Erro ao buscar logs de automação.');
    return res.json();
  },

  async testAutomation(data: {
    target: 'telegram' | 'n8n';
    customUrl?: string;
    customToken?: string;
    chatId?: string;
    message?: string;
  }): Promise<{ ok: boolean; simulated?: boolean; log?: WebhookLog }> {
    const res = await fetch('/api/automations/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha no teste de automação.');
    return res.json();
  },
};
