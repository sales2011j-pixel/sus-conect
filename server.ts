import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { db } from './server/db.ts';
import { processAnaMessage } from './server/susAnaService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header as required
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;


// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      cpf,
      susCard,
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    } = req.body;

    // Rigor de Segurança: Bloqueia qualquer tentativa de auto-atribuição de papel privilegiado
    if (req.body.role && req.body.role !== 'citizen') {
      return res.status(403).json({
        error: 'Tentativa de definição de privilégios não autorizada. Novos usuários são sempre cadastrados como cidadãos.'
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    // Backend validation for CPF if provided
    if (cpf) {
      const cleanCPF = String(cpf).replace(/\D/g, '');
      if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
        return res.status(400).json({ error: 'O CPF informado possui formato inválido.' });
      }

      let sum = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(cleanCPF.charAt(i), 10) * (10 - i);
      let rev = 11 - (sum % 11);
      if (rev === 10 || rev === 11) rev = 0;
      if (rev !== parseInt(cleanCPF.charAt(9), 10)) {
        return res.status(400).json({ error: 'Dígito verificador do CPF inválido.' });
      }

      sum = 0;
      for (let i = 0; i < 10; i++) sum += parseInt(cleanCPF.charAt(i), 10) * (11 - i);
      rev = 11 - (sum % 11);
      if (rev === 10 || rev === 11) rev = 0;
      if (rev !== parseInt(cleanCPF.charAt(10), 10)) {
        return res.status(400).json({ error: 'Dígito verificador do CPF inválido.' });
      }
    }

    // Backend validation for Cartão SUS if provided
    if (susCard) {
      const cleanSUS = String(susCard).replace(/\D/g, '');
      if (cleanSUS.length !== 15 || /^(\d)\1{14}$/.test(cleanSUS)) {
        return res.status(400).json({ error: 'O Cartão Nacional de Saúde (CNS) deve conter exatamente 15 dígitos válidos.' });
      }
    }

    const user = db.createUser({
      name,
      email,
      phone: phone || '',
      password,
      cpf: cpf || '',
      susCard: susCard || '',
      cep: cep || '',
      street: street || '',
      number: number || '',
      complement: complement || '',
      neighborhood: neighborhood || '',
      city: city || '',
      state: state || '',
    });

    return res.status(201).json({ user, message: 'Cadastro realizado com sucesso no SUS CONECT!' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao realizar cadastro.' });
  }
});


app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }
    const user = db.findUserByEmail(email);
    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    const { passwordHash: _, ...safeUser } = user;
    return res.json({ user: safeUser, token: 'demo-jwt-token-' + user.id });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro interno ao autenticar.' });
  }
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'E-mail e nova senha são obrigatórios.' });
    }
    db.resetPassword(email, newPassword);
    return res.json({ message: 'Senha atualizada com sucesso. Você já pode fazer login.' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao redefinir senha.' });
  }
});

// Helper de autenticação para autorização no motor local
function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (token.startsWith('demo-jwt-token-')) {
    const userId = token.replace('demo-jwt-token-', '');
    return db.getUserById(userId) || null;
  }
  return null;
}

// Rotas de perfil com aplicação rigorosa de isolamento RLS e controle de privilégios
app.get('/api/users/:id', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Acesso não autenticado. Faça login para consultar dados de perfil.' });
  }

  const { id } = req.params;
  // Rigor RLS: Usuário só consulta a si mesmo, a menos que seja administrador
  if (authUser.id !== id && authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para consultar o perfil de outro paciente.' });
  }

  const target = db.getUserById(id);
  if (!target) {
    return res.status(404).json({ error: 'Perfil de usuário não encontrado.' });
  }

  const { passwordHash: _, ...safeUser } = target;
  return res.json(safeUser);
});

app.patch('/api/users/:id', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Acesso não autenticado. Faça login para atualizar seu perfil.' });
  }

  const { id } = req.params;
  // Rigor RLS: Usuário só altera a si mesmo, a menos que seja administrador
  if (authUser.id !== id && authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para alterar dados de outro paciente.' });
  }

  // Rigor de Privilégios: Bloqueia tentativa de auto-elevação de papel
  if ('role' in req.body && req.body.role !== authUser.role && authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Alteração de papel (role) não autorizada. Apenas administradores podem conceder privilégios.' });
  }

  try {
    const updatedUser = db.updateUserProfile(id, req.body);
    return res.json({ user: updatedUser, message: 'Perfil atualizado com sucesso.' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao atualizar perfil.' });
  }
});

// --- DIAGNÓSTICO SUPABASE ---
app.get('/api/supabase/status', async (_req: Request, res: Response) => {
  const url = process.env.VITE_SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || '';

  const isConfigured =
    url.length > 0 &&
    key.length > 0 &&
    !url.includes('SUA_PROJECT_URL') &&
    !url.includes('your-project') &&
    !key.includes('SUA_PUBLISHABLE_KEY') &&
    !key.includes('your-anon');

  if (!isConfigured) {
    return res.json({
      configured: false,
      mode: 'local_resilient',
      message: 'Supabase não configurado com credenciais reais no ambiente de servidor (.env). A aplicação está operando com persistência local resiliente.',
      instructions: {
        step1: 'Obtenha a Project URL e a anon/public key no painel do Supabase (Project Settings > API).',
        step2: 'Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env ou no modal de conexão da aplicação.',
      },
    });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(url, key);
    const start = Date.now();

    const tableNames = ['specialties', 'professionals', 'appointments', 'demonstrative_documents', 'webhook_logs', 'profiles'];
    const auditResults: Record<string, any> = {};

    for (const t of tableNames) {
      const { data, error, count } = await client
        .from(t)
        .select('*', { count: 'exact', head: false })
        .limit(3);

      if (error) {
        auditResults[t] = { ok: false, error: error.message, code: error.code };
      } else {
        auditResults[t] = { ok: true, count: count ?? data?.length, sampleCount: data?.length || 0 };
      }
    }

    const latencyMs = Date.now() - start;

    return res.json({
      configured: true,
      mode: 'supabase_connected',
      latencyMs,
      tables: auditResults,
      message: 'Conexão ativa e validada com sucesso com o banco de dados Supabase.',
    });
  } catch (err: any) {
    return res.status(500).json({
      configured: true,
      mode: 'connection_failed',
      error: err.message,
    });
  }
});

// --- SPECIALTIES & PROFESSIONALS ROUTES ---

app.get('/api/specialties', (_req: Request, res: Response) => {
  const specialties = db.getSpecialties();
  return res.json(specialties);
});

app.get('/api/professionals', (req: Request, res: Response) => {
  const specialtyId = req.query.specialtyId as string | undefined;
  const professionals = db.getProfessionals(specialtyId);
  return res.json(professionals);
});

app.put('/api/professionals/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = db.updateProfessional(id, updates);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao atualizar profissional.' });
  }
});

app.post('/api/professionals', (req: Request, res: Response) => {
  try {
    const { name, specialtyId, availableDays, shifts, bioSummary } = req.body;
    if (!name || !specialtyId) {
      return res.status(400).json({ error: 'Nome e área de atendimento são obrigatórios.' });
    }
    const specialty = db.getSpecialtyById(specialtyId);
    if (!specialty) {
      return res.status(400).json({ error: 'Especialidade inválida.' });
    }
    const created = db.createProfessional({
      name,
      specialtyId,
      specialtyName: specialty.name,
      availableDays: availableDays || ['Segunda', 'Quarta', 'Sexta'],
      shifts: shifts || ['Manhã', 'Tarde'],
      active: true,
      rating: 5.0,
      bioSummary: bioSummary || 'Atendimento acolhedor e escuta qualificada.',
    });
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao cadastrar profissional.' });
  }
});

// --- APPOINTMENTS ROUTES ---

app.get('/api/appointments', (req: Request, res: Response) => {
  const citizenId = req.query.citizenId as string | undefined;
  const role = req.query.role as string | undefined;

  if (role === 'admin') {
    return res.json(db.getAllAppointments());
  }

  if (citizenId) {
    return res.json(db.getAppointmentsByCitizen(citizenId));
  }

  return res.json(db.getAllAppointments());
});

function maskPhoneForLog(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return 'Não informado';
  return `****-${digits.slice(-4)}`;
}

const DEFAULT_N8N_WHATSAPP_WEBHOOK_URL = 'https://n8n.pointcontrol.com.br/webhook/sus-conect-agendamento';

function getN8nWhatsappWebhookUrl(): string {
  const envUrl = (process.env.N8N_WHATSAPP_WEBHOOK_URL || '').trim();
  if (envUrl && envUrl.startsWith('http') && !envUrl.includes('your-n8n')) {
    return envUrl;
  }
  return DEFAULT_N8N_WHATSAPP_WEBHOOK_URL;
}

async function notifyAppointmentWhatsappViaN8n(data: {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  specialtyName: string;
  date: string;
  time: string;
  virtualRoomId?: string;
}): Promise<{ ok: boolean; status: 'sent' | 'simulated' | 'error'; message: string }> {
  const webhookUrl = getN8nWhatsappWebhookUrl();
  const webhookSecret = (process.env.N8N_WHATSAPP_SECRET || '').trim();
  const maskedPhone = maskPhoneForLog(data.patientPhone);

  const cleanDigits = String(data.patientPhone || '').replace(/\D/g, '');
  if (cleanDigits.length < 10) {
    db.addWebhookLog({
      target: 'n8n',
      event: 'WHATSAPP_TELEFONE_AUSENTE',
      payload: {
        appointmentId: data.appointmentId,
        specialty: data.specialtyName,
      },
      status: 'error',
      message: `Notificação WhatsApp não enviada para agendamento ${data.appointmentId}: telefone do paciente não informado.`,
    });
    return {
      ok: false,
      status: 'error',
      message: 'Telefone/WhatsApp do paciente não informado ou inválido.',
    };
  }

  const payload = {
    event: 'APPOINTMENT_CONFIRMED',
    appointmentId: data.appointmentId,
    patientName: data.patientName,
    patientPhone: data.patientPhone,
    doctorName: data.doctorName,
    specialtyName: data.specialtyName,
    date: data.date,
    time: data.time,
    virtualRoomId: data.virtualRoomId || '',
    timestamp: new Date().toISOString(),
  };

  if (!webhookUrl || !webhookUrl.startsWith('http') || webhookUrl.includes('your-n8n')) {
    db.addWebhookLog({
      target: 'n8n',
      event: 'WHATSAPP_CONFIRMACAO_SIMULADA',
      payload: {
        appointmentId: data.appointmentId,
        patientPhone: maskedPhone,
        specialty: data.specialtyName,
        doctor: data.doctorName,
        date: data.date,
        time: data.time,
      },
      status: 'simulated',
      message: `Confirmação WhatsApp preparada para ${data.patientName} (${maskedPhone}). Configure N8N_WHATSAPP_WEBHOOK_URL para disparo real no n8n.`,
    });
    return {
      ok: true,
      status: 'simulated',
      message: 'Payload preparado em modo de demonstração (N8N_WHATSAPP_WEBHOOK_URL ainda não configurada no servidor).',
    };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (webhookSecret) {
      headers['x-sus-webhook-secret'] = webhookSecret;
    }

    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    const logStatus = n8nRes.ok ? 'sent' : 'error';
    const logMessage = n8nRes.ok
      ? `Confirmação de teleconsulta enviada ao workflow n8n (WhatsApp ${maskedPhone}, HTTP ${n8nRes.status}).`
      : `Workflow n8n respondeu com erro HTTP ${n8nRes.status} para agendamento ${data.appointmentId}.`;

    db.addWebhookLog({
      target: 'n8n',
      event: n8nRes.ok ? 'WHATSAPP_CONFIRMACAO_ENVIADA' : 'WHATSAPP_CONFIRMACAO_FALHA',
      payload: {
        appointmentId: data.appointmentId,
        patientPhone: maskedPhone,
        specialty: data.specialtyName,
        httpStatus: n8nRes.status,
      },
      status: logStatus,
      message: logMessage,
    });

    return { ok: n8nRes.ok, status: logStatus, message: logMessage };
  } catch (err: any) {
    const errMsg = `Falha de conexão com o webhook n8n de WhatsApp: ${err.message || 'Erro de rede'}`;
    db.addWebhookLog({
      target: 'n8n',
      event: 'WHATSAPP_CONFIRMACAO_ERRO_REDE',
      payload: {
        appointmentId: data.appointmentId,
        patientPhone: maskedPhone,
        error: err.message,
      },
      status: 'error',
      message: errMsg,
    });
    return { ok: false, status: 'error', message: errMsg };
  }
}

app.post('/api/appointments', async (req: Request, res: Response) => {
  try {
    const { citizenId, professionalId, specialtyId, date, time, reason, citizenPhone } = req.body;
    if (!citizenId || !professionalId || !specialtyId || !date || !time) {
      return res.status(400).json({ error: 'Campos obrigatórios de agendamento não preenchidos.' });
    }
    const appointment = db.createAppointment({
      citizenId,
      professionalId,
      specialtyId,
      date,
      time,
      reason: reason || 'Consulta de rotina e esclarecimento preventivo',
      citizenPhone,
    });

    // Disparo automático para o workflow n8n de WhatsApp (não bloqueia a criação se n8n oscilar)
    await notifyAppointmentWhatsappViaN8n({
      appointmentId: appointment.id,
      patientName: appointment.citizenName,
      patientPhone: appointment.citizenPhone,
      doctorName: appointment.professionalName,
      specialtyName: appointment.specialtyName,
      date: appointment.date,
      time: appointment.time,
      virtualRoomId: appointment.virtualRoomId,
    });

    return res.status(201).json(appointment);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao solicitar agendamento.' });
  }
});

app.post('/api/appointments/notify-whatsapp', async (req: Request, res: Response) => {
  try {
    const {
      appointmentId,
      patientName,
      patientPhone,
      doctorName,
      specialtyName,
      date,
      time,
      virtualRoomId,
    } = req.body;

    if (!appointmentId || !patientName || !doctorName || !specialtyName || !date || !time) {
      return res.status(400).json({ error: 'Dados do agendamento incompletos para notificação WhatsApp.' });
    }

    const result = await notifyAppointmentWhatsappViaN8n({
      appointmentId,
      patientName,
      patientPhone: patientPhone || '',
      doctorName,
      specialtyName,
      date,
      time,
      virtualRoomId,
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao notificar agendamento via WhatsApp.' });
  }
});

app.put('/api/appointments/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório.' });
    }
    const updated = db.updateAppointmentStatus(id, status, notes);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao atualizar status do agendamento.' });
  }
});

// --- WEBRTC TELECONSULTA ROOMS & SOCKET REGISTRY ---

interface RoomParticipant {
  ws: WebSocket;
  userId: string;
  userName: string;
  role: 'doctor' | 'patient';
}

const teleRooms = new Map<string, Map<string, RoomParticipant>>();

function broadcastToRoom(appointmentId: string, message: any, excludeWs?: WebSocket) {
  const room = teleRooms.get(appointmentId);
  if (!room) return;
  const payload = JSON.stringify(message);
  for (const participant of room.values()) {
    if (participant.ws !== excludeWs && participant.ws.readyState === WebSocket.OPEN) {
      participant.ws.send(payload);
    }
  }
}

// --- DOCTOR AGENDA & TELECONSULTA ROUTES ---

app.get('/api/doctor/agenda', (req: Request, res: Response) => {
  try {
    const professionalId = req.query.professionalId as string | undefined;
    const date = req.query.date as string | undefined;
    const appointments = db.getDoctorAgenda(professionalId, date);

    const metrics = {
      total: appointments.length,
      confirmed: appointments.filter((a) => a.status === 'confirmado' || a.status === 'solicitado').length,
      inProgress: appointments.filter((a) => a.status === 'em_andamento').length,
      completed: appointments.filter((a) => a.status === 'concluido').length,
      waiting: appointments.filter((a) => a.status === 'aguardando_paciente').length,
      absent: appointments.filter((a) => a.status === 'paciente_ausente').length,
      cancelled: appointments.filter((a) => a.status === 'cancelado').length,
    };

    return res.json({ appointments, metrics, serverTime: new Date().toISOString() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao carregar agenda do profissional.' });
  }
});

app.get('/api/teleconsulta/:id/session', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = db.getTeleconsultaSession(id);
    const room = teleRooms.get(id);
    if (room) {
      for (const p of room.values()) {
        if (p.role === 'doctor') session.doctorConnected = true;
        if (p.role === 'patient') session.patientConnected = true;
      }
    }
    return res.json(session);
  } catch (error: any) {
    return res.status(404).json({ error: error.message || 'Sessão não encontrada.' });
  }
});

app.post('/api/teleconsulta/:id/start', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = db.startTeleconsulta(id);

    // Broadcast call started event over WebSockets
    broadcastToRoom(id, {
      type: 'call-started',
      appointmentId: id,
      startedAt: session.startedAt,
      durationLimitSeconds: session.durationLimitSeconds,
      remainingSeconds: session.remainingSeconds,
      serverNow: session.serverNow,
    });

    return res.json(session);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao iniciar teleconsulta.' });
  }
});

app.post('/api/teleconsulta/:id/end', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { durationSeconds, notes } = req.body;
    const updated = db.finishTeleconsulta(id, durationSeconds, notes);

    // Broadcast call ended
    broadcastToRoom(id, {
      type: 'call-ended',
      appointmentId: id,
      endedAt: updated.endedAt,
      effectiveDurationSeconds: updated.effectiveDurationSeconds,
      status: 'concluido',
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao finalizar teleconsulta.' });
  }
});

app.post('/api/teleconsulta/:id/extend', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, minutes } = req.body;
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'Justificativa clínica obrigatória para autorizar extensão.' });
    }

    const session = db.extendTeleconsulta(id, reason, Number(minutes) || 5);

    // Broadcast extension
    broadcastToRoom(id, {
      type: 'call-extended',
      appointmentId: id,
      reason,
      additionalMinutes: Number(minutes) || 5,
      totalLimitSeconds: session.durationLimitSeconds,
      remainingSeconds: session.remainingSeconds,
    });

    return res.json(session);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao registrar extensão clínica.' });
  }
});

// --- DEMONSTRATIVE DOCUMENTS ROUTES ---

app.get('/api/documents', (req: Request, res: Response) => {
  const citizenId = (req.query.citizenId as string) || 'user_citizen_demo';
  const documents = db.getDocumentsByCitizen(citizenId);
  return res.json(documents);
});

app.post('/api/documents', (req: Request, res: Response) => {
  try {
    const docData = req.body;
    const newDoc = db.createDocument(docData);
    return res.status(201).json(newDoc);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao emitir documento demonstrativo.' });
  }
});

// --- AUTOMATIONS & WEBHOOKS ROUTES ---

app.get('/api/automations/logs', (_req: Request, res: Response) => {
  const logs = db.getWebhookLogs();
  return res.json(logs);
});

app.get('/api/automations/whatsapp-status', (_req: Request, res: Response) => {
  const webhookUrl = getN8nWhatsappWebhookUrl();
  const fromEnv = Boolean((process.env.N8N_WHATSAPP_WEBHOOK_URL || '').trim());
  return res.json({
    configured: Boolean(webhookUrl && webhookUrl.startsWith('http')),
    source: fromEnv ? 'environment_variable' : 'server_production_config',
    webhookUrl,
    trigger: 'appointment_confirmed',
    secretHeaderEnabled: Boolean((process.env.N8N_WHATSAPP_SECRET || '').trim()),
  });
});

app.post('/api/automations/test', async (req: Request, res: Response) => {
  try {
    const { target, customUrl, customToken, chatId, message } = req.body;

    if (target === 'telegram' && customToken && chatId) {
      // Real Telegram notification attempt if user provided their bot token & chat id
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${customToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message || '🔔 Notificação de teste do SUS CONECT (Formação Geração Tech 4.0)',
          }),
        });
        const tgData = await tgRes.json();
        db.addWebhookLog({
          target: 'telegram',
          event: 'TESTE_MANUAL_TELEGRAM',
          payload: { chatId, status: tgData.ok },
          status: tgData.ok ? 'sent' : 'error',
          message: tgData.ok
            ? 'Mensagem enviada com sucesso ao Telegram!'
            : `Telegram API retornou: ${tgData.description || 'Erro desconhecido'}`,
        });
        return res.json({ ok: tgData.ok, data: tgData });
      } catch (tgErr: any) {
        db.addWebhookLog({
          target: 'telegram',
          event: 'FALHA_CONEXAO_TELEGRAM',
          payload: { error: tgErr.message },
          status: 'error',
          message: `Falha na requisição ao Telegram: ${tgErr.message}`,
        });
      }
    } else if (target === 'n8n' && (customUrl || getN8nWhatsappWebhookUrl())) {
      const targetUrl = (customUrl || getN8nWhatsappWebhookUrl()).trim();
      const webhookSecret = (process.env.N8N_WHATSAPP_SECRET || '').trim();
      // Real n8n webhook call if URL provided or configured via env
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (webhookSecret) {
          headers['x-sus-webhook-secret'] = webhookSecret;
        }
        const n8nRes = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            event: 'APPOINTMENT_CONFIRMED',
            appointmentId: 'apt_teste_n8n',
            patientName: 'Paciente Teste SUS CONECT',
            patientPhone: '5585985421274',
            doctorName: 'Dr. Marcos Silva',
            specialtyName: 'Clínica Geral',
            date: new Date().toISOString().split('T')[0],
            time: '14:30',
            virtualRoomId: 'sala-sus-teste-0001',
            timestamp: new Date().toISOString(),
            message: message || 'Teste de automação com webhook n8n',
          }),
          signal: AbortSignal.timeout(8000),
        });
        db.addWebhookLog({
          target: 'n8n',
          event: 'WEBHOOK_N8N_DISPARADO',
          payload: { status: n8nRes.status },
          status: n8nRes.ok ? 'sent' : 'error',
          message: `Webhook n8n disparado com código HTTP ${n8nRes.status}.`,
        });
        return res.json({ ok: n8nRes.ok, status: n8nRes.status });
      } catch (n8nErr: any) {
        db.addWebhookLog({
          target: 'n8n',
          event: 'FALHA_N8N',
          payload: { error: n8nErr.message },
          status: 'error',
          message: `Falha ao acionar webhook n8n: ${n8nErr.message}`,
        });
      }
    }

    // Default simulation fallback
    const simulatedLog = db.addWebhookLog({
      target: target || 'telegram',
      event: target === 'n8n' ? 'SIMULACAO_ORQUESTRACAO_N8N' : 'SIMULACAO_ALERTA_TELEGRAM',
      payload: {
        plataforma: 'SUS CONECT',
        evento: 'NOTIFICACAO_ADMINISTRATIVA_DEMO',
        detalhes: message || 'Agendamento sincronizado com sucesso.',
      },
      status: 'simulated',
      message:
        target === 'n8n'
          ? 'Automação n8n simulada: workflow ativado para processamento assíncrono.'
          : 'Notificação Telegram simulada: mensagem registrada no canal administrativo da coordenação.',
    });

    return res.json({ ok: true, simulated: true, log: simulatedLog });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao processar automação.' });
  }
});

// --- GEMINI AI ASSISTANT SUS ANA ROUTE (CONVERSATIONAL INTELLIGENCE) ---

app.post('/api/chat/ana', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem do cidadão é obrigatória.' });
    }

    const result = await processAnaMessage({
      message,
      history,
      aiClient: ai,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Erro na rota /api/chat/ana:', error);
    return res.status(500).json({
      reply: 'Entendi o que você relatou. Tive uma breve oscilação de rede, mas você pode solicitar uma teleconsulta com um clínico geral no seu Painel ou procurar a UPA mais próxima se tiver sintomas de alerta.',
      suggestions: ['Agendar Teleconsulta', 'Sinais de Urgência (192)', 'Voltar ao início'],
    });
  }
});

// --- WEBSOCKET SERVER FOR WEBRTC SIGNALING & SYNCHRONIZED TIMER ---

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  if (url.pathname.startsWith('/ws/teleconsulta')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws: WebSocket) => {
  let currentAppointmentId: string | null = null;
  let currentUserId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      switch (data.type) {
        case 'join': {
          const { appointmentId, userId, userName, role } = data;
          if (!appointmentId || !userId) return;

          currentAppointmentId = appointmentId;
          currentUserId = userId;

          if (!teleRooms.has(appointmentId)) {
            teleRooms.set(appointmentId, new Map());
          }
          const room = teleRooms.get(appointmentId)!;
          room.set(userId, { ws, userId, userName, role: role || 'patient' });

          const session = db.getTeleconsultaSession(appointmentId);

          let doctorOnline = false;
          let patientOnline = false;
          for (const p of room.values()) {
            if (p.role === 'doctor') doctorOnline = true;
            if (p.role === 'patient') patientOnline = true;
          }

          ws.send(
            JSON.stringify({
              type: 'room-state',
              session: {
                ...session,
                doctorConnected: doctorOnline,
                patientConnected: patientOnline,
              },
              peers: Array.from(room.values()).map((p) => ({
                userId: p.userId,
                userName: p.userName,
                role: p.role,
              })),
            })
          );

          // Broadcast peer presence to other clients in room
          broadcastToRoom(
            appointmentId,
            {
              type: 'peer-joined',
              userId,
              userName,
              role,
              doctorConnected: doctorOnline,
              patientConnected: patientOnline,
            },
            ws
          );
          break;
        }

        case 'webrtc-offer':
        case 'webrtc-answer':
        case 'webrtc-ice-candidate': {
          if (currentAppointmentId) {
            broadcastToRoom(
              currentAppointmentId,
              {
                ...data,
                fromUserId: currentUserId,
              },
              ws
            );
          }
          break;
        }

        case 'chat-message': {
          if (currentAppointmentId) {
            broadcastToRoom(currentAppointmentId, {
              type: 'chat-message',
              fromUserId: currentUserId,
              sender: data.sender,
              text: data.text,
              time: data.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            });
          }
          break;
        }

        case 'sync-clock': {
          if (currentAppointmentId) {
            const session = db.getTeleconsultaSession(currentAppointmentId);
            ws.send(
              JSON.stringify({
                type: 'clock-sync',
                serverNow: session.serverNow,
                startedAt: session.startedAt,
                remainingSeconds: session.remainingSeconds,
                durationLimitSeconds: session.durationLimitSeconds,
                status: session.status,
              })
            );
          }
          break;
        }
      }
    } catch (e) {
      console.error('Erro no processamento do WebSocket:', e);
    }
  });

  ws.on('close', () => {
    if (currentAppointmentId && currentUserId) {
      const room = teleRooms.get(currentAppointmentId);
      if (room) {
        room.delete(currentUserId);
        if (room.size === 0) {
          teleRooms.delete(currentAppointmentId);
        } else {
          broadcastToRoom(currentAppointmentId, {
            type: 'peer-left',
            userId: currentUserId,
          });
        }
      }
    }
  });
});

// Setup Vite or static serving
async function setupApp() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUS CONECT] Servidor operacional na porta ${PORT} (HTTP + WebSockets WebRTC)`);
  });
}

setupApp().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
});
