import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Activity, User as UserIcon, Shield, LogOut } from 'lucide-react';

interface HeaderProps {
  currentView: 'home' | 'citizen' | 'admin';
  onNavigate: (view: 'home' | 'citizen' | 'admin') => void;
  onOpenAnaChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onOpenAnaChat }) => {
  const { user, isAuthenticated, logout, openAuthModal, switchDemoUser } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Academic Banner */}
      <div className="bg-[#0D47A1] text-white text-xs py-1 px-4 text-center">
        <span className="font-medium">Formação Geração Tech 4.0</span>
        <span className="mx-2 text-white/50">·</span>
        <span>Projeto Acadêmico Independente — Simulação de Teleatendimento em Saúde Pública</span>
        <span className="mx-2 text-white/50">·</span>
        <span className="text-emerald-300 font-semibold">Sem vínculo oficial com órgãos governamentais</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-18">
          {/* Zone 1: Single text element wordmark with clean icon */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group focus-visible:outline-hidden cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E6FB8] to-[#0D47A1] flex items-center justify-center text-white shadow-xs group-hover:scale-102 transition-transform">
              <Activity className="w-6 h-6 text-white" strokeWidth={2.4} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[#0D47A1] flex items-center gap-1">
                SUS <span className="text-[#00A884]">CONECT</span>
              </span>
              <span className="text-[11px] font-medium text-slate-500 tracking-wider uppercase">
                Saúde Digital Humanizada
              </span>
            </div>
          </button>

          {/* Zone 2: 4-5 concise single-line text links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              onClick={() => onNavigate('home')}
              className={`hover:text-[#1E6FB8] transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'home' ? 'text-[#1E6FB8] font-bold border-b-2 border-[#1E6FB8] py-1' : ''
              }`}
            >
              Início
            </button>
            <a
              href="#areas-atendimento"
              onClick={(e) => {
                if (currentView !== 'home') {
                  e.preventDefault();
                  onNavigate('home');
                  setTimeout(() => {
                    document.getElementById('areas-atendimento')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }
              }}
              className="hover:text-[#1E6FB8] transition-colors whitespace-nowrap"
            >
              Áreas de Atendimento
            </a>
            <a
              href="#como-funciona"
              onClick={(e) => {
                if (currentView !== 'home') {
                  e.preventDefault();
                  onNavigate('home');
                  setTimeout(() => {
                    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }
              }}
              className="hover:text-[#1E6FB8] transition-colors whitespace-nowrap"
            >
              Como Funciona
            </a>
            <button
              onClick={onOpenAnaChat}
              className="text-[#00A884] font-semibold hover:text-emerald-700 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <span>Assistente SUS ANA</span>
            </button>
            <a
              href="#projeto-academico"
              onClick={(e) => {
                if (currentView !== 'home') {
                  e.preventDefault();
                  onNavigate('home');
                  setTimeout(() => {
                    document.getElementById('projeto-academico')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }
              }}
              className="hover:text-[#1E6FB8] transition-colors whitespace-nowrap text-slate-500"
            >
              Sobre o Projeto
            </a>
          </nav>

          {/* Zone 3: 1 primary action / Authenticated controls */}
          <div className="flex items-center gap-3 shrink-0">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {user.role === 'admin' ? (
                  <button
                    onClick={() => onNavigate(currentView === 'admin' ? 'home' : 'admin')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>{currentView === 'admin' ? 'Ver Início' : 'Painel Coordenação'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate(currentView === 'citizen' ? 'home' : 'citizen')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>{currentView === 'citizen' ? 'Ver Início' : 'Meu Painel'}</span>
                  </button>
                )}

                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-36">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {user.role === 'admin' ? 'Administrador' : 'Cidadão'}
                  </span>
                </div>

                <button
                  onClick={logout}
                  title="Encerrar Sessão"
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-[#1E6FB8] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Entrar
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#1E6FB8] hover:bg-[#0D47A1] rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                >
                  Cadastrar-se
                </button>
              </div>
            )}

            {/* Quick Demo Switcher for Evaluation Committee */}
            <div className="hidden sm:flex items-center border-l border-slate-200 pl-2 gap-1 text-slate-400 text-xs">
              <button
                onClick={() => switchDemoUser('citizen')}
                title="Acesso Rápido para a Banca: Cidadão Demo"
                className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                Demo Cidadão
              </button>
              <button
                onClick={() => switchDemoUser('admin')}
                title="Acesso Rápido para a Banca: Coordenação Demo"
                className="px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
              >
                Demo Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
