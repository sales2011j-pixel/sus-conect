import {
  User,
  RegisterData,
  Specialty,
  Professional,
  Appointment,
  DemonstrativeDocument,
  WebhookLog,
  AppointmentStatus,
} from '../types/index.ts';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';

export const api = {
  // --- AUTHENTICATION ---
  async register(data: RegisterData): Promise<{ user: User }> {
    if (isSupabaseConfigured()) {
      // Real Supabase Auth signUp with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            phone: data.phone || '',
            role: 'citizen',
            cpf: data.cpf || '',
            sus_card: data.susCard || '',
            cep: data.cep || '',
            street: data.street || '',
            number: data.number || '',
            complement: data.complement || '',
            neighborhood: data.neighborhood || '',
            city: data.city || '',
            state: data.state || '',
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const supaUser = authData.user;
      if (!supaUser) {
        throw new Error('Não foi possível obter os dados do usuário registrado no Supabase.');
      }

      // Upsert into public.profiles with complete address and identification
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: supaUser.id,
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        role: 'citizen',
        cpf: data.cpf || '',
        sus_card: data.susCard || '',
        cep: data.cep || '',
        street: data.street || '',
        number: data.number || '',
        complement: data.complement || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || '',
      });

      if (profileError) {
        console.warn('Erro ao salvar profile no Supabase:', profileError.message);
      }

      const user: User = {
        id: supaUser.id,
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        role: 'citizen',
        cpf: data.cpf || '',
        susCard: data.susCard || '',
        cep: data.cep || '',
        street: data.street || '',
        number: data.number || '',
        complement: data.complement || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || '',
        createdAt: supaUser.created_at || new Date().toISOString(),
      };

      return { user };
    }


    // Server fallback
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
    if (isSupabaseConfigured()) {
      // Real Supabase Auth signInWithPassword
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const supaUser = authData.user;
      if (!supaUser) {
        throw new Error('Falha ao autenticar com Supabase.');
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supaUser.id)
        .single();

      const user: User = {
        id: supaUser.id,
        name: profile?.name || supaUser.user_metadata?.name || email.split('@')[0],
        email: supaUser.email || email,
        phone: profile?.phone || supaUser.user_metadata?.phone || '',
        role: (profile?.role as 'citizen' | 'admin') || (supaUser.user_metadata?.role as 'citizen' | 'admin') || 'citizen',
        cpf: profile?.cpf || supaUser.user_metadata?.cpf || '',
        susCard: profile?.sus_card || supaUser.user_metadata?.sus_card || '',
        cep: profile?.cep || supaUser.user_metadata?.cep || '',
        street: profile?.street || supaUser.user_metadata?.street || '',
        number: profile?.number || supaUser.user_metadata?.number || '',
        complement: profile?.complement || supaUser.user_metadata?.complement || '',
        neighborhood: profile?.neighborhood || supaUser.user_metadata?.neighborhood || '',
        city: profile?.city || supaUser.user_metadata?.city || '',
        state: profile?.state || supaUser.user_metadata?.state || '',
        createdAt: supaUser.created_at || new Date().toISOString(),
      };

      return { user, token: authData.session?.access_token || 'supa-token' };
    }

    // Server fallback
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
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        throw new Error(error.message);
      }
      return { message: 'Link de redefinição de senha enviado para o e-mail via Supabase Auth.' };
    }

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

  // --- SPECIALTIES ---
  async getSpecialties(): Promise<Specialty[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('specialties')
        .select('*')
        .order('name');

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          description: d.description,
          iconName: d.icon_name,
          professionalCount: d.professional_count,
          category: d.category,
        }));
      }
    }

    const res = await fetch('/api/specialties');
    if (!res.ok) throw new Error('Erro ao carregar especialidades.');
    return res.json();
  },

  // --- PROFESSIONALS ---
  async getProfessionals(specialtyId?: string): Promise<Professional[]> {
    if (isSupabaseConfigured()) {
      let query = supabase.from('professionals').select('*');
      if (specialtyId && specialtyId !== 'all') {
        query = query.eq('specialty_id', specialtyId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((p) => ({
          id: p.id,
          name: p.name,
          specialtyId: p.specialty_id,
          specialtyName: p.specialty_name,
          availableDays: p.available_days || [],
          shifts: p.shifts || [],
          active: p.active,
          rating: Number(p.rating) || 5.0,
          bioSummary: p.bio_summary || '',
        }));
      }
    }

    const url = specialtyId ? `/api/professionals?specialtyId=${specialtyId}` : '/api/professionals';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao carregar profissionais.');
    return res.json();
  },

  async updateProfessional(id: string, updates: Partial<Professional>): Promise<Professional> {
    if (isSupabaseConfigured()) {
      const supaUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) supaUpdates.name = updates.name;
      if (updates.active !== undefined) supaUpdates.active = updates.active;
      if (updates.bioSummary !== undefined) supaUpdates.bio_summary = updates.bioSummary;
      if (updates.shifts !== undefined) supaUpdates.shifts = updates.shifts;
      if (updates.availableDays !== undefined) supaUpdates.available_days = updates.availableDays;

      const { data, error } = await supabase
        .from('professionals')
        .update(supaUpdates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          specialtyId: data.specialty_id,
          specialtyName: data.specialty_name,
          availableDays: data.available_days,
          shifts: data.shifts,
          active: data.active,
          rating: Number(data.rating),
          bioSummary: data.bio_summary,
        };
      }
    }

    const res = await fetch(`/api/professionals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Erro ao atualizar profissional.');
    return res.json();
  },

  async createProfessional(data: Partial<Professional>): Promise<Professional> {
    if (isSupabaseConfigured()) {
      const id = 'prof_' + Date.now().toString(36);
      const { data: inserted, error } = await supabase
        .from('professionals')
        .insert({
          id,
          name: data.name,
          specialty_id: data.specialtyId,
          specialty_name: data.specialtyName,
          available_days: data.availableDays || ['Segunda', 'Quarta', 'Sexta'],
          shifts: data.shifts || ['Manhã', 'Tarde'],
          active: true,
          rating: 5.0,
          bio_summary: data.bioSummary || 'Atendimento acolhedor e humanizado.',
        })
        .select()
        .single();

      if (!error && inserted) {
        return {
          id: inserted.id,
          name: inserted.name,
          specialtyId: inserted.specialty_id,
          specialtyName: inserted.specialty_name,
          availableDays: inserted.available_days,
          shifts: inserted.shifts,
          active: inserted.active,
          rating: Number(inserted.rating),
          bioSummary: inserted.bio_summary,
        };
      }
    }

    const res = await fetch('/api/professionals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao cadastrar profissional.');
    return res.json();
  },

  // --- APPOINTMENTS ---
  async getAppointments(citizenId?: string, role?: string): Promise<Appointment[]> {
    if (isSupabaseConfigured()) {
      let query = supabase.from('appointments').select('*').order('created_at', { ascending: false });
      if (role !== 'admin' && citizenId) {
        query = query.eq('citizen_id', citizenId);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map((a) => ({
          id: a.id,
          citizenId: a.citizen_id,
          citizenName: a.citizen_name,
          citizenEmail: a.citizen_email,
          citizenPhone: a.citizen_phone || '',
          professionalId: a.professional_id,
          professionalName: a.professional_name,
          specialtyId: a.specialty_id,
          specialtyName: a.specialty_name,
          date: a.appointment_date,
          time: a.appointment_time,
          status: a.status as AppointmentStatus,
          reason: a.reason,
          notes: a.notes,
          virtualRoomId: a.virtual_room_id,
          createdAt: a.created_at,
        }));
      }
    }

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
    citizenName?: string;
    citizenEmail?: string;
    citizenPhone?: string;
  }): Promise<Appointment> {
    if (isSupabaseConfigured()) {
      // Find professional, specialty & real citizen profile (when any field is omitted)
      const [profRes, specRes, profileRes] = await Promise.all([
        supabase.from('professionals').select('name').eq('id', data.professionalId).single(),
        supabase.from('specialties').select('name, slug').eq('id', data.specialtyId).single(),
        (!data.citizenName || !data.citizenEmail || !data.citizenPhone)
          ? supabase.from('profiles').select('name, email, phone').eq('id', data.citizenId).single()
          : Promise.resolve({ data: null }),
      ]);

      const profName = profRes.data?.name || 'Profissional de Saúde';
      const specName = specRes.data?.name || 'Área de Atendimento';
      const specSlug = specRes.data?.slug || 'geral';
      const virtualRoomId = `sala-sus-${specSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

      const realCitizenName = data.citizenName || profileRes.data?.name || 'Cidadão SUS CONECT';
      const realCitizenEmail = data.citizenEmail || profileRes.data?.email || 'cidadao@exemplo.com';
      const realCitizenPhone = data.citizenPhone || profileRes.data?.phone || '';

      const { data: inserted, error } = await supabase
        .from('appointments')
        .insert({
          citizen_id: data.citizenId,
          citizen_name: realCitizenName,
          citizen_email: realCitizenEmail,
          citizen_phone: realCitizenPhone,
          professional_id: data.professionalId,
          professional_name: profName,
          specialty_id: data.specialtyId,
          specialty_name: specName,
          appointment_date: data.date,
          appointment_time: data.time,
          status: 'confirmado',
          reason: data.reason,
          virtual_room_id: virtualRoomId,
        })
        .select()
        .single();

      if (!error && inserted) {
        // Trigger server-side n8n WhatsApp workflow securely (non-blocking for UX resilience)
        try {
          const notifyRes = await fetch('/api/appointments/notify-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appointmentId: inserted.id,
              patientName: inserted.citizen_name,
              patientPhone: inserted.citizen_phone || realCitizenPhone,
              doctorName: inserted.professional_name,
              specialtyName: inserted.specialty_name,
              date: inserted.appointment_date,
              time: inserted.appointment_time,
              virtualRoomId: inserted.virtual_room_id,
            }),
          });
          if (notifyRes.ok) {
            const notifyJson = await notifyRes.json();
            await supabase.from('webhook_logs').insert({
              target: 'n8n',
              event: 'WHATSAPP_CONFIRMACAO_AGENDAMENTO',
              payload: {
                appointmentId: inserted.id,
                specialty: inserted.specialty_name,
                status: notifyJson.status,
              },
              status: notifyJson.status || 'sent',
              message: notifyJson.message || 'Notificação WhatsApp processada pelo workflow n8n.',
            });
          }
        } catch (notifyErr) {
          console.warn('Falha não-bloqueante ao notificar WhatsApp via n8n:', notifyErr);
        }

        return {
          id: inserted.id,
          citizenId: inserted.citizen_id,
          citizenName: inserted.citizen_name,
          citizenEmail: inserted.citizen_email,
          citizenPhone: inserted.citizen_phone || '',
          professionalId: inserted.professional_id,
          professionalName: inserted.professional_name,
          specialtyId: inserted.specialty_id,
          specialtyName: inserted.specialty_name,
          date: inserted.appointment_date,
          time: inserted.appointment_time,
          status: inserted.status as AppointmentStatus,
          reason: inserted.reason,
          notes: inserted.notes,
          virtualRoomId: inserted.virtual_room_id,
          createdAt: inserted.created_at,
        };
      }
    }

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
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status, ...(notes !== undefined ? { notes } : {}) })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          citizenId: data.citizen_id,
          citizenName: data.citizen_name,
          citizenEmail: data.citizen_email,
          citizenPhone: data.citizen_phone || '',
          professionalId: data.professional_id,
          professionalName: data.professional_name,
          specialtyId: data.specialty_id,
          specialtyName: data.specialty_name,
          date: data.appointment_date,
          time: data.appointment_time,
          status: data.status as AppointmentStatus,
          reason: data.reason,
          notes: data.notes,
          virtualRoomId: data.virtual_room_id,
          createdAt: data.created_at,
        };
      }
    }

    const res = await fetch(`/api/appointments/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) throw new Error('Erro ao atualizar status.');
    return res.json();
  },

  // --- DEMONSTRATIVE DOCUMENTS ---
  async getDocuments(citizenId: string): Promise<DemonstrativeDocument[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('demonstrative_documents')
        .select('*')
        .order('issued_date', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          citizenId: d.citizen_id,
          citizenName: d.citizen_name,
          title: d.title,
          type: d.document_type as any,
          issuedDate: d.issued_date,
          doctorName: d.doctor_name,
          specialty: d.specialty,
          documentNumber: d.document_number,
          content: d.content,
        }));
      }
    }

    const res = await fetch(`/api/documents?citizenId=${citizenId}`);
    if (!res.ok) throw new Error('Erro ao carregar documentos.');
    return res.json();
  },

  async createDocument(data: Partial<DemonstrativeDocument>): Promise<DemonstrativeDocument> {
    if (isSupabaseConfigured()) {
      const docNum = `DOC-SUS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: inserted, error } = await supabase
        .from('demonstrative_documents')
        .insert({
          citizen_id: data.citizenId || 'user_citizen_demo',
          citizen_name: data.citizenName || 'Maria Silva',
          title: data.title || 'Declaração Demonstrativa',
          document_type: data.type || 'atestado',
          issued_date: data.issuedDate || new Date().toISOString().split('T')[0],
          doctor_name: data.doctorName || 'Médico do SUS CONECT',
          specialty: data.specialty || 'Clínica Geral',
          document_number: docNum,
          content: data.content || {},
        })
        .select()
        .single();

      if (!error && inserted) {
        return {
          id: inserted.id,
          citizenId: inserted.citizen_id,
          citizenName: inserted.citizen_name,
          title: inserted.title,
          type: inserted.document_type as any,
          issuedDate: inserted.issued_date,
          doctorName: inserted.doctor_name,
          specialty: inserted.specialty,
          documentNumber: inserted.document_number,
          content: inserted.content,
        };
      }
    }

    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao emitir documento.');
    return res.json();
  },

  // --- CHAT WITH SUS ANA (Server-side Gemini) ---
  async sendChatMessage(message: string, history: { sender: string; text: string }[]): Promise<{ reply: string; suggestions?: string[] }> {
    const res = await fetch('/api/chat/ana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) throw new Error('Erro na comunicação com a assistente.');
    return res.json();
  },

  // --- AUTOMATIONS & WEBHOOKS ---
  async getAutomationLogs(): Promise<WebhookLog[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        return data.map((l) => ({
          id: l.id,
          timestamp: l.created_at,
          target: l.target as 'telegram' | 'n8n',
          event: l.event,
          payload: l.payload,
          status: l.status as 'sent' | 'simulated' | 'error',
          message: l.message,
        }));
      }
    }

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

  // --- DOCTOR AGENDA & TELECONSULTA SESSIONS ---
  async getDoctorAgenda(professionalId?: string, date?: string): Promise<{
    appointments: Appointment[];
    metrics: {
      total: number;
      confirmed: number;
      inProgress: number;
      completed: number;
      waiting: number;
      absent: number;
      cancelled: number;
    };
    serverTime: string;
  }> {
    let url = '/api/doctor/agenda';
    const params = new URLSearchParams();
    if (professionalId) params.append('professionalId', professionalId);
    if (date) params.append('date', date);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao buscar agenda médica.');
    return res.json();
  },

  async getTeleconsultaSession(appointmentId: string): Promise<any> {
    const res = await fetch(`/api/teleconsulta/${appointmentId}/session`);
    if (!res.ok) throw new Error('Erro ao obter sessão da teleconsulta.');
    return res.json();
  },

  async startTeleconsulta(appointmentId: string): Promise<any> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('appointments')
        .update({
          status: 'em_andamento',
          started_at: new Date().toISOString(),
          video_session_id: 'session_' + Date.now().toString(36),
        })
        .eq('id', appointmentId);
    }

    const res = await fetch(`/api/teleconsulta/${appointmentId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Erro ao iniciar teleconsulta.');
    return res.json();
  },

  async finishTeleconsulta(appointmentId: string, durationSeconds?: number, notes?: string): Promise<Appointment> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('appointments')
        .update({
          status: 'concluido',
          ended_at: new Date().toISOString(),
          effective_duration_seconds: durationSeconds,
          ...(notes ? { notes } : {}),
        })
        .eq('id', appointmentId);
    }

    const res = await fetch(`/api/teleconsulta/${appointmentId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationSeconds, notes }),
    });
    if (!res.ok) throw new Error('Erro ao concluir teleconsulta.');
    return res.json();
  },

  async extendTeleconsulta(appointmentId: string, reason: string, minutes: number = 5): Promise<any> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('appointments')
        .update({
          clinical_extension_reason: reason,
        })
        .eq('id', appointmentId);
    }

    const res = await fetch(`/api/teleconsulta/${appointmentId}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, minutes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao autorizar extensão clínica.');
    }
    return res.json();
  },
};
