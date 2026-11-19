import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Specialty, Professional, Appointment, DemonstrativeDocument } from '../types/index.ts';
import { api } from '../services/api.ts';
import { DocumentModal } from '../components/DocumentModal.tsx';
import { TeleconsultaRoom } from '../components/TeleconsultaRoom.tsx';
import { WaitingRoom } from '../components/WaitingRoom.tsx';
import { SusAnaChat } from '../components/SusAnaChat.tsx';
import { maskCPFForDisplay, maskCartaoSUSForDisplay, formatPhone } from '../utils/masksAndValidators.ts';

import {
  Calendar,
  Clock,
  Video,
  FileText,
  User,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  Bot,
  Filter,
  ArrowRight,
  ShieldAlert,
  Download,
} from 'lucide-react';

interface CitizenPortalProps {
  specialties: Specialty[];
  initialSpecialtyId?: string | null;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  specialties,
  initialSpecialtyId,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'new_booking' | 'appointments' | 'documents' | 'ana' | 'profile'>('overview');

  // Appointments & Documents
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<DemonstrativeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Active Rooms
  const [selectedDoc, setSelectedDoc] = useState<DemonstrativeDocument | null>(null);
  const [activeWaitingRoomAppointment, setActiveWaitingRoomAppointment] = useState<Appointment | null>(null);
  const [activeTeleRoomAppointment, setActiveTeleRoomAppointment] = useState<Appointment | null>(null);

  // New Booking Wizard State
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>(initialSpecialtyId || specialties[0]?.id || '');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('09:30');
  const [reason, setReason] = useState<string>('');
  const [whatsappPhone, setWhatsappPhone] = useState<string>(user?.phone ? formatPhone(user.phone) : '');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.phone) {
      setWhatsappPhone((prev) => prev || formatPhone(user.phone));
    }
  }, [user?.phone]);

  // Set initial default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  // When initialSpecialtyId changes, switch to booking tab
  useEffect(() => {
    if (initialSpecialtyId) {
      setSelectedSpecialtyId(initialSpecialtyId);
      setActiveTab('new_booking');
    }
  }, [initialSpecialtyId]);

  // Load appointments and documents
  const loadCitizenData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [apts, docs] = await Promise.all([
        api.getAppointments(user.id),
        api.getDocuments(user.id),
      ]);
      setAppointments(apts);
      setDocuments(docs);
    } catch (err) {
      console.error('Erro ao carregar dados do cidadão:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCitizenData();
  }, [user]);

  // Load professionals when specialty changes
  useEffect(() => {
    const fetchProfs = async () => {
      if (!selectedSpecialtyId) return;
      try {
        const profs = await api.getProfessionals(selectedSpecialtyId);
        setProfessionals(profs);
        if (profs.length > 0) {
          setSelectedProfessionalId(profs[0].id);
        } else {
          setSelectedProfessionalId('');
        }
      } catch (err) {
        console.error('Erro ao buscar profissionais:', err);
      }
    };
    fetchProfs();
  }, [selectedSpecialtyId]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(null);

    try {
      const created = await api.createAppointment({
        citizenId: user.id,
        citizenName: user.name,
        citizenEmail: user.email,
        citizenPhone: whatsappPhone || user.phone || '',
        professionalId: selectedProfessionalId,
        specialtyId: selectedSpecialtyId,
        date: selectedDate,
        time: selectedTime,
        reason: reason || 'Teleorientação preventiva de rotina',
      });

      setBookingSuccess(created);
      await loadCitizenData();
      setReason('');
    } catch (err: any) {
      setBookingError(err.message || 'Erro ao realizar agendamento.');
    } finally {
      setBookingLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmado':
        return (
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Confirmado
          </span>
        );
      case 'solicitado':
        return (
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            Aguardando Confirmação
          </span>
        );
      case 'concluido':
        return (
          <span className="text-[11px] font-bold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-slate-600" />
            Concluído
          </span>
        );
      case 'cancelado':
        return (
          <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  const currentSpecialty = specialties.find((s) => s.id === selectedSpecialtyId);
  const currentProfessional = professionals.find((p) => p.id === selectedProfessionalId);

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-[#1E6FB8] to-[#0D47A1] rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1">
              <span>Painel do Cidadão</span>
              <span aria-hidden="true">·</span>
              <span>SUS CONECT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Olá, {user?.name || 'Cidadão'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100">
              Acesse suas teleconsultas agendadas, emita receitas demonstrativas e solicite novo atendimento com 90 profissionais.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setActiveTab('new_booking');
                setBookingSuccess(null);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Teleconsulta</span>
            </button>
            <button
              onClick={() => setActiveTab('ana')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-2 border border-white/20"
            >
              <Bot className="w-4 h-4 text-emerald-300" />
              <span>Falar com SUS ANA</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-2xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-[#1E6FB8] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('new_booking');
              setBookingSuccess(null);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'new_booking'
                ? 'bg-[#1E6FB8] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Solicitar Teleconsulta</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'appointments'
                ? 'bg-[#1E6FB8] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Meus Agendamentos ({appointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'bg-[#1E6FB8] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documentos ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ana')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'ana'
                ? 'bg-[#1E6FB8] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Assistente SUS ANA</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-[#1E6FB8] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Meu Perfil</span>
          </button>
        </div>

        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Consultas Agendadas
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 tabular-nums">
                    {appointments.filter((a) => a.status === 'confirmado' || a.status === 'solicitado').length}
                  </span>
                  <span className="text-xs text-slate-500">ativas</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Documentos Emitidos
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 tabular-nums">
                    {documents.length}
                  </span>
                  <span className="text-xs text-slate-500">demonstrativos</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Profissionais Disponíveis
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-600 tabular-nums">90</span>
                  <span className="text-xs text-slate-500">em 12 áreas</span>
                </div>
              </div>
            </div>

            {/* Next Upcoming Appointment Highlight */}
            {appointments.length > 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#1E6FB8]" />
                    <span>Próxima Teleconsulta Programada</span>
                  </h3>
                  {getStatusBadge(appointments[0].status)}
                </div>

                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#0D47A1]">
                      {appointments[0].specialtyName}
                    </span>
                    <h4 className="text-base font-bold text-slate-900">
                      {appointments[0].professionalName}
                    </h4>
                    <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(appointments[0].date).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {appointments[0].time}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        if (appointments[0].status === 'em_andamento') {
                          setActiveTeleRoomAppointment(appointments[0]);
                        } else {
                          setActiveWaitingRoomAppointment(appointments[0]);
                        }
                      }}
                      className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 min-h-[44px]"
                    >
                      <Video className="w-4 h-4 text-emerald-100" />
                      <span>
                        {appointments[0].status === 'em_andamento'
                          ? 'Entrar na Chamada em Andamento'
                          : 'Acessar Sala de Espera Virtual'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-3">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Nenhuma teleconsulta agendada no momento
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Você pode solicitar seu atendimento com um dos 90 profissionais em qualquer uma das 12 áreas de saúde.
                </p>
                <button
                  onClick={() => setActiveTab('new_booking')}
                  className="px-4 py-2 bg-[#1E6FB8] hover:bg-[#0D47A1] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Agendar Agora
                </button>
              </div>
            )}

            {/* Demonstrative Documents Snippet */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#1E6FB8]" />
                  <span>Documentos Demonstrativos Recentes</span>
                </h3>
                <button
                  onClick={() => setActiveTab('documents')}
                  className="text-xs font-semibold text-[#1E6FB8] hover:underline cursor-pointer"
                >
                  Ver todos ({documents.length})
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.slice(0, 2).map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="p-4 rounded-xl border border-slate-200 hover:border-[#1E6FB8] transition-colors cursor-pointer bg-slate-50/50 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {doc.type} · {doc.documentNumber}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                        {doc.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {doc.doctorName} ({doc.specialty})
                      </p>
                    </div>
                    <Download className="w-4 h-4 text-[#1E6FB8] shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NOVA SOLICITAÇÃO (AGENDADOR) */}
        {activeTab === 'new_booking' && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-2xs">
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <span className="text-xs font-bold text-[#1E6FB8] uppercase tracking-wider">
                  Agendamento Virtual
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  Solicitar Nova Teleconsulta
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Preencha os passos abaixo para agendar sua orientação com um profissional qualificado.
                </p>
              </div>

              {bookingSuccess && (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>Teleconsulta solicitada com sucesso!</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Sua solicitação para <strong>{bookingSuccess.specialtyName}</strong> com{' '}
                    <strong>{bookingSuccess.professionalName}</strong> no dia{' '}
                    <strong>{new Date(bookingSuccess.date).toLocaleDateString('pt-BR')} às {bookingSuccess.time}</strong>{' '}
                    foi confirmada e enviada para coordenação médica.
                  </p>
                  {bookingSuccess.citizenPhone && (
                    <p className="text-[11px] text-emerald-800 bg-emerald-100/70 px-3 py-1.5 rounded-lg inline-block font-medium">
                      📲 Confirmação automática encaminhada para o WhatsApp <strong>{bookingSuccess.citizenPhone}</strong>.
                    </p>
                  )}
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => setActiveTeleRoomAppointment(bookingSuccess)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                    >
                      <Video className="w-4 h-4" />
                      <span>Abrir Sala Virtual Agora</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className="px-4 py-2 bg-white text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Ver em Meus Agendamentos
                    </button>
                  </div>
                </div>
              )}

              {bookingError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              <form onSubmit={handleCreateAppointment} className="space-y-6">
                {/* Step 1: Area Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    1. Escolha a Área de Atendimento
                  </label>
                  <select
                    value={selectedSpecialtyId}
                    onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8] font-medium"
                  >
                    {specialties.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.professionalCount} profissionais disponíveis)
                        {s.category === 'atendimento_profissional' ? ' — Saúde Mental' : ''}
                      </option>
                    ))}
                  </select>
                  {currentSpecialty && (
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                      💡 {currentSpecialty.description}
                    </p>
                  )}
                </div>

                {/* Step 2: Choose from 90 professionals */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    2. Selecione o Profissional de Saúde
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                    {professionals.map((prof) => {
                      const isSelected = selectedProfessionalId === prof.id;
                      return (
                        <div
                          key={prof.id}
                          onClick={() => setSelectedProfessionalId(prof.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'bg-blue-50 border-[#1E6FB8] ring-2 ring-[#1E6FB8]/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900">
                              {prof.name}
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-600 tabular-nums">
                              ★ {prof.rating.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {prof.bioSummary}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2">
                            <span>Dias: {prof.availableDays.join(', ')}</span>
                            <span>·</span>
                            <span>Turnos: {prof.shifts.join('/')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      3. Data da Teleconsulta
                    </label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      4. Horário Desejado
                    </label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                    >
                      <option value="08:30">08:30 (Manhã)</option>
                      <option value="09:30">09:30 (Manhã)</option>
                      <option value="10:30">10:30 (Manhã)</option>
                      <option value="14:00">14:00 (Tarde)</option>
                      <option value="15:30">15:30 (Tarde)</option>
                      <option value="16:30">16:30 (Tarde)</option>
                      <option value="18:30">18:30 (Noite)</option>
                      <option value="19:30">19:30 (Noite)</option>
                    </select>
                  </div>
                </div>

                {/* Step 4: Reason */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    5. Motivo do Atendimento / Sintomas Principais
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Descreva brevemente o que está sentindo ou se deseja orientações de rotina (ex: acompanhamento de pressão, sintomas gripais, acolhimento de ansiedade)..."
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  ></textarea>
                </div>

                {/* Step 5: WhatsApp Number Confirmation */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    6. WhatsApp para Confirmação da Teleconsulta
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Você receberá neste WhatsApp a confirmação automática com data, horário, médico e especialidade.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={bookingLoading || !selectedProfessionalId}
                    className="w-full py-3.5 px-6 bg-[#1E6FB8] hover:bg-[#0D47A1] text-white font-bold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>{bookingLoading ? 'Processando Solicitação...' : 'Confirmar Solicitação de Teleconsulta'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: MEUS AGENDAMENTOS */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Meus Agendamentos
                </h3>
                <p className="text-xs text-slate-500">
                  Histórico e solicitações ativas de teleatendimento
                </p>
              </div>
              <button
                onClick={() => setActiveTab('new_booking')}
                className="px-3.5 py-2 bg-[#1E6FB8] text-white font-bold text-xs rounded-lg hover:bg-[#0D47A1] transition-colors cursor-pointer"
              >
                + Nova Consulta
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhum agendamento registrado até o momento.
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1E6FB8]">
                          {apt.specialtyName}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500 font-medium">
                          ID: {apt.id}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">
                        {apt.professionalName}
                      </h4>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(apt.date).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {apt.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 pt-1">
                        <strong>Motivo:</strong> {apt.reason}
                      </p>
                      {apt.notes && (
                        <p className="text-xs text-slate-500 italic bg-white p-2 rounded-lg border border-slate-200/80">
                          <strong>Observações médicas:</strong> {apt.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                      {getStatusBadge(apt.status)}

                      {apt.status !== 'cancelado' && (
                        <button
                          onClick={() => {
                            if (apt.status === 'em_andamento') {
                              setActiveTeleRoomAppointment(apt);
                            } else {
                              setActiveWaitingRoomAppointment(apt);
                            }
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs whitespace-nowrap min-h-[44px]"
                        >
                          <Video className="w-4 h-4 text-emerald-100" />
                          <span>
                            {apt.status === 'em_andamento'
                              ? 'Entrar na Chamada'
                              : 'Sala de Espera & Câmera'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DOCUMENTOS DEMONSTRATIVOS */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Documentos Demonstrativos de Saúde
              </h3>
              <p className="text-xs text-slate-500">
                Receitas digitais, declarações de comparecimento e planos de cuidados expedidos durante suas teleconsultas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-[#1E6FB8] hover:shadow-xs transition-all cursor-pointer bg-slate-50/50 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {doc.type} · {doc.documentNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(doc.issuedDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {doc.title}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {doc.content.diagnosisOrSubject || doc.content.bodyText}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      {doc.doctorName}
                    </span>
                    <button className="text-[#1E6FB8] font-bold flex items-center gap-1">
                      <span>Visualizar Documento</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SUS ANA CHAT */}
        {activeTab === 'ana' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden max-w-3xl mx-auto h-[620px]">
            <SusAnaChat
              isFloating={false}
              onNavigateToBooking={() => setActiveTab('new_booking')}
            />
          </div>
        )}

        {/* TAB 6: PERFIL DO CIDADÃO */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-2xs max-w-2xl mx-auto space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Dados Básicos do Cidadão
              </h3>
              <p className="text-xs text-slate-500">
                Informações cadastrais simplificadas da sua conta no SUS CONECT
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Nome Completo:</span>
                <span className="font-bold text-slate-900">{user?.name}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">E-mail de Acesso:</span>
                <span className="font-mono text-slate-900">{user?.email}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">CPF (Protegido por LGPD):</span>
                <span className="font-mono font-semibold text-slate-800">{maskCPFForDisplay(user?.cpf)}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Cartão Nacional de Saúde (SUS):</span>
                <span className="font-mono font-semibold text-slate-800">{maskCartaoSUSForDisplay(user?.susCard)}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Telefone / WhatsApp:</span>
                <span className="font-mono text-slate-900">{user?.phone || 'Não informado'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-start">
                <span className="text-slate-500 font-medium">Endereço Residencial:</span>
                <span className="text-right text-slate-800 font-medium max-w-[280px]">
                  {user?.street
                    ? `${user.street}, ${user.number || 'S/N'}${user.complement ? ` (${user.complement})` : ''} - ${user.neighborhood}, ${user.city}/${user.state} (CEP ${user.cep})`
                    : 'Endereço padrão de demonstração'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Perfil de Acesso:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase text-[10px]">
                  Cidadão Cadastrado
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-[#0D47A1] leading-relaxed">
              🔒 <strong>Compromisso de Privacidade e LGPD:</strong> Seus identificadores pessoais (CPF e Cartão SUS) são mascarados na interface para preservar sua privacidade. Em caso de dúvidas, consulte nossa política de dados.
            </div>
          </div>
        )}
      </div>

      {/* Demonstrative Document Viewer Modal */}
      {selectedDoc && (
        <DocumentModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* Patient Waiting Room */}
      {activeWaitingRoomAppointment && (
        <WaitingRoom
          appointment={activeWaitingRoomAppointment}
          onEnterCall={() => {
            const apt = activeWaitingRoomAppointment;
            setActiveWaitingRoomAppointment(null);
            setActiveTeleRoomAppointment(apt);
          }}
          onClose={() => setActiveWaitingRoomAppointment(null)}
        />
      )}

      {/* Interactive Teleconsultation Room */}
      {activeTeleRoomAppointment && (
        <TeleconsultaRoom
          appointment={activeTeleRoomAppointment}
          userRole="patient"
          onClose={() => setActiveTeleRoomAppointment(null)}
          onCompleted={() => {
            loadCitizenData();
            setActiveTab('documents');
          }}
        />
      )}
    </div>
  );
};
