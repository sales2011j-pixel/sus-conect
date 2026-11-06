import fs from 'fs';
import path from 'path';
import {
  User,
  Specialty,
  Professional,
  Appointment,
  DemonstrativeDocument,
  WebhookLog,
  AppointmentStatus,
} from '../src/types/index.ts';
import {
  INITIAL_SPECIALTIES,
  INITIAL_PROFESSIONALS,
  INITIAL_APPOINTMENTS,
  INITIAL_DOCUMENTS,
} from './initialData.ts';

interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  specialties: Specialty[];
  professionals: Professional[];
  appointments: Appointment[];
  documents: DemonstrativeDocument[];
  webhookLogs: WebhookLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sus_conect_db.json');

const INITIAL_USERS: (User & { passwordHash: string })[] = [
  {
    id: 'user_citizen_demo',
    name: 'Maria Silva',
    email: 'maria.silva@exemplo.com',
    phone: '(11) 98765-4321',
    role: 'citizen',
    passwordHash: 'senha123',
    createdAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: 'user_admin_demo',
    name: 'Coord. Dr. Roberto Sales',
    email: 'admin@susconect.gov.br',
    phone: '(11) 91234-5678',
    role: 'admin',
    passwordHash: 'admin123',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users || INITIAL_USERS,
          specialties: parsed.specialties || INITIAL_SPECIALTIES,
          professionals: parsed.professionals || INITIAL_PROFESSIONALS,
          appointments: parsed.appointments || INITIAL_APPOINTMENTS,
          documents: parsed.documents || INITIAL_DOCUMENTS,
          webhookLogs: parsed.webhookLogs || [],
        };
      }
    } catch (e) {
      console.warn('Could not read existing database file, initializing from defaults:', e);
    }

    const initial: DatabaseSchema = {
      users: INITIAL_USERS,
      specialties: INITIAL_SPECIALTIES,
      professionals: INITIAL_PROFESSIONALS,
      appointments: INITIAL_APPOINTMENTS,
      documents: INITIAL_DOCUMENTS,
      webhookLogs: [],
    };
    this.saveToDisk(initial);
    return initial;
  }

  private saveToDisk(dataToSave: DatabaseSchema = this.data) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database to disk:', e);
    }
  }

  // --- Auth & Users ---
  public findUserByEmail(email: string) {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string) {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(userData: { name: string; email: string; phone: string; password: string; role?: 'citizen' | 'admin' }) {
    const existing = this.findUserByEmail(userData.email);
    if (existing) {
      throw new Error('E-mail já cadastrado na plataforma.');
    }

    const newUser = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: userData.name,
      email: userData.email.toLowerCase(),
      phone: userData.phone,
      role: userData.role || 'citizen',
      passwordHash: userData.password,
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.saveToDisk();

    // Remove passwordHash for public return
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  public resetPassword(email: string, newPassword: string) {
    const user = this.findUserByEmail(email);
    if (!user) {
      throw new Error('Cidadão não localizado com este e-mail.');
    }
    user.passwordHash = newPassword;
    this.saveToDisk();
    return true;
  }

  // --- Specialties ---
  public getSpecialties() {
    return this.data.specialties;
  }

  public getSpecialtyById(id: string) {
    return this.data.specialties.find((s) => s.id === id);
  }

  // --- Professionals ---
  public getProfessionals(specialtyId?: string) {
    if (specialtyId && specialtyId !== 'all') {
      return this.data.professionals.filter((p) => p.specialtyId === specialtyId);
    }
    return this.data.professionals;
  }

  public getProfessionalById(id: string) {
    return this.data.professionals.find((p) => p.id === id);
  }

  public updateProfessional(id: string, updates: Partial<Professional>) {
    const prof = this.getProfessionalById(id);
    if (!prof) {
      throw new Error('Profissional não encontrado.');
    }
    Object.assign(prof, updates);
    this.saveToDisk();
    return prof;
  }

  public createProfessional(newProf: Omit<Professional, 'id'>) {
    const created: Professional = {
      ...newProf,
      id: 'prof_' + Date.now().toString(36),
    };
    this.data.professionals.push(created);

    // Update count in specialty
    const spec = this.getSpecialtyById(newProf.specialtyId);
    if (spec) {
      spec.professionalCount = this.data.professionals.filter((p) => p.specialtyId === spec.id).length;
    }

    this.saveToDisk();
    return created;
  }

  // --- Appointments ---
  public getAppointmentsByCitizen(citizenId: string) {
    return this.data.appointments
      .filter((a) => a.citizenId === citizenId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllAppointments() {
    return [...this.data.appointments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getAppointmentById(id: string) {
    return this.data.appointments.find((a) => a.id === id);
  }

  public createAppointment(data: {
    citizenId: string;
    professionalId: string;
    specialtyId: string;
    date: string;
    time: string;
    reason: string;
  }) {
    const citizen = this.findUserById(data.citizenId);
    const professional = this.getProfessionalById(data.professionalId);
    const specialty = this.getSpecialtyById(data.specialtyId);

    if (!citizen) throw new Error('Cidadão não encontrado.');
    if (!professional) throw new Error('Profissional de saúde não encontrado.');
    if (!specialty) throw new Error('Área de atendimento não encontrada.');

    const newAppointment: Appointment = {
      id: 'apt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      citizenId: citizen.id,
      citizenName: citizen.name,
      citizenEmail: citizen.email,
      citizenPhone: citizen.phone,
      professionalId: professional.id,
      professionalName: professional.name,
      specialtyId: specialty.id,
      specialtyName: specialty.name,
      date: data.date,
      time: data.time,
      status: 'solicitado',
      reason: data.reason,
      virtualRoomId: `sala-sus-${specialty.slug}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };

    this.data.appointments.unshift(newAppointment);

    // Auto-create demonstrative notification
    this.addWebhookLog({
      target: 'telegram',
      event: 'NOVA_SOLICITACAO_TELECONSULTA',
      payload: {
        appointmentId: newAppointment.id,
        citizen: newAppointment.citizenName,
        professional: newAppointment.professionalName,
        specialty: newAppointment.specialtyName,
        datetime: `${newAppointment.date} às ${newAppointment.time}`,
      },
      status: 'sent',
      message: `🔔 [SUS CONECT] Nova solicitação de teleconsulta para ${newAppointment.specialtyName} com ${newAppointment.professionalName} solicitada por ${newAppointment.citizenName}.`,
    });

    this.saveToDisk();
    return newAppointment;
  }

  public updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
    notes?: string
  ) {
    const appointment = this.getAppointmentById(id);
    if (!appointment) throw new Error('Agendamento não encontrado.');

    appointment.status = status;
    if (notes !== undefined) {
      appointment.notes = notes;
    }

    // Auto log telegram notification for admin status change
    this.addWebhookLog({
      target: 'telegram',
      event: `STATUS_${status.toUpperCase()}`,
      payload: {
        appointmentId: appointment.id,
        newStatus: status,
        citizen: appointment.citizenName,
        datetime: `${appointment.date} às ${appointment.time}`,
      },
      status: 'sent',
      message: `📋 [ADMINISTRATIVO] Agendamento ${appointment.id} atualizado para status '${status}' (${appointment.citizenName} - ${appointment.specialtyName}).`,
    });

    this.saveToDisk();
    return appointment;
  }

  // --- Demonstrative Documents ---
  public getDocumentsByCitizen(citizenId: string) {
    return this.data.documents.filter((d) => d.citizenId === citizenId || d.citizenId === 'user_citizen_demo');
  }

  public getDocumentById(id: string) {
    return this.data.documents.find((d) => d.id === id);
  }

  public createDocument(doc: Omit<DemonstrativeDocument, 'id' | 'documentNumber'>) {
    const count = this.data.documents.length + 1;
    const documentNumber = `DOC-SUS-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newDoc: DemonstrativeDocument = {
      ...doc,
      id: 'doc_' + Date.now().toString(36),
      documentNumber,
    };
    this.data.documents.unshift(newDoc);
    this.saveToDisk();
    return newDoc;
  }

  // --- Webhooks & Notifications ---
  public getWebhookLogs() {
    return [...this.data.webhookLogs].reverse().slice(0, 30);
  }

  public addWebhookLog(log: Omit<WebhookLog, 'id' | 'timestamp'>) {
    const newLog: WebhookLog = {
      ...log,
      id: 'log_' + Date.now().toString(36),
      timestamp: new Date().toISOString(),
    };
    this.data.webhookLogs.push(newLog);
    if (this.data.webhookLogs.length > 100) {
      this.data.webhookLogs.shift();
    }
    this.saveToDisk();
    return newLog;
  }
}

export const db = new Database();
