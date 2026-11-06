import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Specialty, Professional, Appointment, WebhookLog, AppointmentStatus } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Shield,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Bell,
  RefreshCw,
  Plus,
  Send,
  Activity,
  Layers,
  FileCheck,
} from 'lucide-react';

interface AdminPortalProps {
  specialties: Specialty[];
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ specialties }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'professionals' | 'specialties' | 'automations'>('requests');

  // Appointments
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingApts, setLoadingApts] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [specFilter, setSpecFilter] = useState<string>('all');

  // Professionals
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingProfs, setLoadingProfs] = useState(true);
  const [profSearch, setProfSearch] = useState('');
  const [profSpecFilter, setProfSpecFilter] = useState<string>('all');

  // Automation Logs
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [testTarget, setTestTarget] = useState<'telegram' | 'n8n'>('telegram');
  const [testMessage, setTestMessage] = useState('🔔 Notificação administrativa de teste: novo agendamento sincronizado com sucesso.');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Load All Appointments
  const loadAppointments = async () => {
    setLoadingApts(true);
    try {
      const data = await api.getAppointments(undefined, 'admin');
      setAppointments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingApts(false);
    }
  };

  // Load All Professionals
  const loadProfessionals = async () => {
    setLoadingProfs(true);
    try {
      const data = await api.getProfessionals();
      setProfessionals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProfs(false);
    }
  };

  // Load Automation Logs
  const loadLogs = async () => {
    try {
      const data = await api.getAutomationLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadProfessionals();
    loadLogs();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: AppointmentStatus) => {
    const note = prompt(`Observação da coordenação para status "${newStatus}":`, 'Atualizado pela coordenação médica.') || undefined;
    try {
      await api.updateAppointmentStatus(id, newStatus, note);
      await loadAppointments();
      await loadLogs();
    } catch (e: any) {
      alert(e.message || 'Erro ao atualizar.');
    }
  };

  const handleToggleProfActive = async (prof: Professional) => {
    try {
      await api.updateProfessional(prof.id, { active: !prof.active });
      await loadProfessionals();
    } catch (e: any) {
      alert(e.message || 'Erro ao alterar status.');
    }
  };

  const handleTestAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testAutomation({
        target: testTarget,
        message: testMessage,
      });
      setTestResult(
        testTarget === 'telegram'
          ? 'Notificação enviada ao canal administrativo do Telegram!'
          : 'Webhook n8n processado com sucesso na esteira!'
      );
      await loadLogs();
    } catch (err: any) {
      setTestResult(`Erro: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (specFilter !== 'all' && apt.specialtyId !== specFilter) return false;
    return true;
  });

  const filteredProfessionals = professionals.filter((prof) => {
    if (profSpecFilter !== 'all' && prof.specialtyId !== profSpecFilter) return false;
    if (profSearch.trim() && !prof.name.toLowerCase().includes(profSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Admin Header Banner */}
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" />
              <span>Painel de Gestão da Coordenação</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">Acesso Restrito</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Coordenação Geral — SUS CONECT
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Gerencie solicitações de teleconsultas, corpo clínico com 90 profissionais e disparos automatizados para Telegram e n8n.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700">
            <span className="text-xs text-slate-400">Logado como:</span>
            <span className="text-xs font-bold text-white">{user?.name}</span>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-2xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Solicitações de Atendimento ({appointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('professionals')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'professionals'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Corpo Clínico (90 Profissionais)</span>
          </button>

          <button
            onClick={() => setActiveTab('specialties')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'specialties'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>12 Áreas de Atendimento</span>
          </button>

          <button
            onClick={() => setActiveTab('automations')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'automations'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4 text-emerald-500" />
            <span>Automações (Telegram & n8n)</span>
          </button>
        </div>

        {/* TAB 1: GESTÃO DE SOLICITAÇÕES */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Gerenciamento de Solicitações
                </h3>
                <p className="text-xs text-slate-500">
                  Confirme, reagende ou conclua teleconsultas solicitadas pelos cidadãos
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="all">Todos os Status</option>
                  <option value="solicitado">Aguardando Confirmação</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>

                <select
                  value={specFilter}
                  onChange={(e) => setSpecFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="all">Todas as Áreas</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={loadAppointments}
                  className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                  title="Recarregar"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loadingApts ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Carregando solicitações...
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhum agendamento encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 font-bold">Cidadão</th>
                      <th className="py-3 px-4 font-bold">Especialidade</th>
                      <th className="py-3 px-4 font-bold">Profissional</th>
                      <th className="py-3 px-4 font-bold">Data & Horário</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAppointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{apt.citizenName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{apt.citizenPhone}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#1E6FB8]">
                          {apt.specialtyName}
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          {apt.professionalName}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="block font-medium">
                            {new Date(apt.date).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            às {apt.time}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                              apt.status === 'confirmado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : apt.status === 'solicitado'
                                ? 'bg-amber-100 text-amber-800'
                                : apt.status === 'concluido'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {apt.status === 'solicitado' && (
                            <button
                              onClick={() => handleUpdateStatus(apt.id, 'confirmado')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
                            >
                              Confirmar
                            </button>
                          )}
                          {apt.status !== 'concluido' && (
                            <button
                              onClick={() => handleUpdateStatus(apt.id, 'concluido')}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-[11px] font-bold cursor-pointer"
                            >
                              Concluir
                            </button>
                          )}
                          {apt.status !== 'cancelado' && (
                            <button
                              onClick={() => handleUpdateStatus(apt.id, 'cancelado')}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md text-[11px] font-bold cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CORPO CLÍNICO DOS 90 PROFISSIONAIS */}
        {activeTab === 'professionals' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Corpo Clínico Credenciado ({professionals.length} profissionais)
                </h3>
                <p className="text-xs text-slate-500">
                  Cadastre, ative ou desative profissionais em cada uma das 12 áreas
                </p>
              </div>

              {/* Search & Area Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={profSearch}
                    onChange={(e) => setProfSearch(e.target.value)}
                    placeholder="Buscar pelo nome..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>

                <select
                  value={profSpecFilter}
                  onChange={(e) => setProfSpecFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="all">Todas as Áreas</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfessionals.map((prof) => (
                <div
                  key={prof.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    prof.active
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50/70 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#1E6FB8]">
                        {prof.specialtyName}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600">
                        ★ {prof.rating.toFixed(1)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {prof.name}
                    </h4>

                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {prof.bioSummary}
                    </p>

                    <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                      <p>Dias: {prof.availableDays.join(', ')}</p>
                      <p>Turnos: {prof.shifts.join(' / ')}</p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Status: <strong className={prof.active ? 'text-emerald-600' : 'text-slate-400'}>{prof.active ? 'Ativo' : 'Desativado'}</strong>
                    </span>

                    <button
                      onClick={() => handleToggleProfActive(prof)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                        prof.active
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {prof.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: 12 ÁREAS DE ATENDIMENTO */}
        {activeTab === 'specialties' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                12 Áreas de Atendimento Cadastradas
              </h3>
              <p className="text-xs text-slate-500">
                Estrutura de especialidades médicas e atendimento profissional em saúde mental
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {specialties.map((spec, idx) => (
                <div
                  key={spec.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-bold text-[#1E6FB8] bg-blue-50 px-2 py-0.5 rounded-sm">
                      {spec.professionalCount} profissionais
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900">
                    {spec.name}
                  </h4>

                  <span className="text-[11px] font-semibold text-slate-500 block">
                    {spec.category === 'atendimento_profissional'
                      ? 'Área de Atendimento Profissional (Saúde Mental)'
                      : 'Especialidade Médica'}
                  </span>

                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    {spec.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AUTOMAÇÕES (TELEGRAM & N8N) */}
        {activeTab === 'automations' && (
          <div className="space-y-6">
            {/* Automation Simulator Tool */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Automação e Orquestração (n8n & Telegram)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Disparo de alertas administrativos e orquestração de eventos em tempo real
                  </p>
                </div>
              </div>

              {testResult && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#0D47A1] font-medium">
                  {testResult}
                </div>
              )}

              <form onSubmit={handleTestAutomation} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Destino da Automação
                    </label>
                    <select
                      value={testTarget}
                      onChange={(e) => setTestTarget(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                    >
                      <option value="telegram">Telegram (Alerta à Coordenação)</option>
                      <option value="n8n">n8n (Workflow de Orquestração)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tipo de Evento
                    </label>
                    <div className="p-2 text-xs bg-slate-100 rounded-lg text-slate-700 font-mono">
                      {testTarget === 'telegram' ? 'NOTIFICACAO_TELEGRAM_ADMIN' : 'WEBHOOK_ORQUESTRACAO_N8N'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mensagem de Teste / Payload Informativo
                  </label>
                  <textarea
                    rows={2}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={testing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testing ? 'Disparando...' : 'Disparar Notificação de Demonstração'}</span>
                </button>
              </form>
            </div>

            {/* Live Webhook & Dispatch Logs */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900">
                  Histórico de Notificações Registradas ({logs.length})
                </h4>
                <button
                  onClick={loadLogs}
                  className="text-xs text-[#1E6FB8] font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Atualizar</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-700">
                          {log.target}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {log.event}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{log.message}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        log.status === 'sent'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.status === 'simulated'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
