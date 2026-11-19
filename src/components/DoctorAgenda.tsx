import React, { useState, useEffect } from 'react';
import { Appointment, Professional, AppointmentStatus } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Calendar,
  Clock,
  Video,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  UserX,
  Stethoscope,
  ChevronRight,
  Shield,
  Activity,
  Phone,
  FileText,
} from 'lucide-react';

interface DoctorAgendaProps {
  onStartConsultation: (appointment: Appointment) => void;
  selectedDoctorId?: string;
}

export const DoctorAgenda: React.FC<DoctorAgendaProps> = ({
  onStartConsultation,
  selectedDoctorId,
}) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [activeDoctorId, setActiveDoctorId] = useState<string>(selectedDoctorId || '');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    waiting: 0,
    absent: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Load professionals roster to populate doctor selector
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const profs = await api.getProfessionals();
        setProfessionals(profs);
        if (!activeDoctorId && profs.length > 0) {
          // Default to first active doctor
          const defaultProf = profs.find((p) => p.name.includes('Dr.')) || profs[0];
          setActiveDoctorId(defaultProf.id);
        }
      } catch (err) {
        console.error('Erro ao carregar médicos:', err);
      }
    };
    loadDoctors();
  }, []);

  // Load agenda appointments
  const loadAgenda = async () => {
    if (!activeDoctorId) return;
    setLoading(true);
    try {
      const data = await api.getDoctorAgenda(activeDoctorId, filterDate);
      setAppointments(data.appointments);
      setMetrics(data.metrics);
    } catch (err) {
      console.error('Erro ao carregar agenda médica:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgenda();
  }, [activeDoctorId, filterDate]);

  const activeDoctor = professionals.find((p) => p.id === activeDoctorId);

  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentStatus) => {
    try {
      await api.updateAppointmentStatus(
        appointmentId,
        newStatus,
        `Status alterado na agenda médica para ${newStatus}`
      );
      await loadAgenda();
    } catch (e: any) {
      alert(e.message || 'Erro ao atualizar status.');
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmado':
        return (
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Confirmado
          </span>
        );
      case 'aguardando_paciente':
        return (
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
            Aguardando Paciente
          </span>
        );
      case 'em_andamento':
        return (
          <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
            <Activity className="w-3 h-3 text-[#1E6FB8]" />
            Em Andamento
          </span>
        );
      case 'concluido':
        return (
          <span className="text-[11px] font-bold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-slate-600" />
            Concluído
          </span>
        );
      case 'paciente_ausente':
        return (
          <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <UserX className="w-3 h-3 text-rose-600" />
            Paciente Ausente
          </span>
        );
      case 'cancelado':
        return (
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(filterDate + 'T12:00:00'));

  return (
    <div className="space-y-6">
      {/* Top Banner with Doctor Identity & Date */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Agenda Diária do Profissional</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="capitalize text-slate-300">{todayFormatted}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <span>{activeDoctor ? activeDoctor.name : 'Painel Médico'}</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-400">
            {activeDoctor?.specialtyName || 'Especialidade Médica'} · Expediente do dia com teleconsultas cronometradas
          </p>
        </div>

        {/* Doctor Switcher Dropdown & Date Picker */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="bg-slate-800 p-2 rounded-2xl border border-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400 ml-2" />
            <select
              value={activeDoctorId}
              onChange={(e) => setActiveDoctorId(e.target.value)}
              className="bg-transparent text-white text-xs font-bold focus:outline-hidden pr-2 cursor-pointer"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name} ({p.specialtyName})
                </option>
              ))}
            </select>
          </div>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-slate-800 text-white text-xs px-3 py-2.5 rounded-2xl border border-slate-700 focus:outline-hidden"
          />

          <button
            onClick={loadAgenda}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition-colors cursor-pointer flex items-center justify-center"
            title="Recarregar Agenda"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total do Dia
          </span>
          <span className="text-2xl font-black text-slate-900 tabular-nums">
            {metrics.total}
          </span>
          <span className="text-[11px] text-slate-500 block">consultas programadas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
            Confirmados
          </span>
          <span className="text-2xl font-black text-emerald-700 tabular-nums">
            {metrics.confirmed}
          </span>
          <span className="text-[11px] text-slate-500 block">agendamento automático</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
            Em Andamento
          </span>
          <span className="text-2xl font-black text-[#1E6FB8] tabular-nums">
            {metrics.inProgress}
          </span>
          <span className="text-[11px] text-slate-500 block">cronômetro ativo</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Concluídos
          </span>
          <span className="text-2xl font-black text-slate-800 tabular-nums">
            {metrics.completed}
          </span>
          <span className="text-[11px] text-slate-500 block">atendimentos realizados</span>
        </div>
      </div>

      {/* Chronological Agenda Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#1E6FB8]" />
              <span>Grade de Atendimentos em Ordem Cronológica</span>
            </h3>
            <p className="text-xs text-slate-500">
              O agendamento é confirmado automaticamente pelo sistema. Inicie a teleconsulta no horário previsto para ativar o cronômetro de 10 minutos.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Carregando consultas da agenda médica...
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <Calendar className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">Nenhum atendimento agendado para esta data.</p>
            <p className="text-slate-400 text-[11px]">Selecione outra data ou solicite um agendamento no Painel do Cidadão para testar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  apt.status === 'em_andamento'
                    ? 'border-[#1E6FB8] bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                }`}
              >
                {/* Time & Patient ID */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-black font-mono bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                      {apt.time}
                    </span>
                    <span className="text-xs font-bold text-[#1E6FB8]">
                      {apt.specialtyName}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {apt.id}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{apt.citizenName}</span>
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {apt.citizenPhone || '(11) 98765-4321'}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="italic text-[11px] text-slate-600">
                      <strong>Motivo:</strong> {apt.reason}
                    </span>
                  </div>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  {getStatusBadge(apt.status)}

                  {/* Primary INICIAR CONSULTA Action */}
                  {apt.status !== 'concluido' && apt.status !== 'cancelado' && (
                    <button
                      onClick={() => onStartConsultation(apt)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md min-h-[44px] ${
                        apt.status === 'em_andamento'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span>{apt.status === 'em_andamento' ? 'Retomar Chamada' : 'INICIAR CONSULTA'}</span>
                    </button>
                  )}

                  {/* Absent Toggle */}
                  {apt.status === 'confirmado' && (
                    <button
                      onClick={() => handleStatusChange(apt.id, 'paciente_ausente')}
                      className="px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                      title="Marcar como ausente após tolerância"
                    >
                      Marcar Ausente
                    </button>
                  )}

                  {/* Completed Action */}
                  {apt.status === 'em_andamento' && (
                    <button
                      onClick={() => handleStatusChange(apt.id, 'concluido')}
                      className="px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                      Concluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
