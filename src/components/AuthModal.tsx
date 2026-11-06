import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, Lock, Mail, User, Phone, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { api } from '../services/api.ts';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalTab, setAuthModalTab, login, register, switchDemoUser } = useAuth();

  const [mode, setMode] = useState<'auth' | 'forgot'>('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const res = await api.resetPassword(email, newPassword);
        setSuccessMsg(res.message);
        setTimeout(() => {
          setMode('auth');
          setAuthModalTab('login');
          setSuccessMsg(null);
        }, 1500);
      } else if (authModalTab === 'login') {
        await login(email, password);
      } else {
        await register(name, email, phone, password);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E6FB8] to-[#0D47A1] p-6 text-white relative">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">
              Acesso à Plataforma
            </span>
          </div>
          <h3 className="text-xl font-bold tracking-tight">
            {mode === 'forgot'
              ? 'Recuperar Senha de Acesso'
              : authModalTab === 'login'
              ? 'Acesse sua Conta no SUS CONECT'
              : 'Criar Cadastro do Cidadão'}
          </h3>
          <p className="text-xs text-blue-100 mt-1">
            {authModalTab === 'login'
              ? 'Consulte seus agendamentos, teleconsultas e documentos demonstrativos.'
              : 'Cadastro simplificado sem necessidade de CPF ou dados sensíveis.'}
          </p>
        </div>

        {/* Tab switchers if not in forgot mode */}
        {mode === 'auth' && (
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => {
                setAuthModalTab('login');
                setError(null);
              }}
              className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer text-center ${
                authModalTab === 'login'
                  ? 'bg-white text-[#1E6FB8] border-b-2 border-[#1E6FB8]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Entrar com E-mail
            </button>
            <button
              onClick={() => {
                setAuthModalTab('register');
                setError(null);
              }}
              className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer text-center ${
                authModalTab === 'register'
                  ? 'bg-white text-[#1E6FB8] border-b-2 border-[#1E6FB8]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Novo Cadastro
            </button>
          </div>
        )}

        {/* Fast Evaluation committee Demo Fill */}
        <div className="p-4 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#0D47A1] font-medium">
            <Sparkles className="w-4 h-4 text-[#1E6FB8] shrink-0" />
            <span>Acesso Rápido para a Banca:</span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => switchDemoUser('citizen')}
              className="text-[11px] font-bold px-2 py-1 bg-white text-[#1E6FB8] hover:bg-blue-100 rounded-md border border-blue-200 shadow-2xs transition-colors cursor-pointer"
            >
              Cidadão Demo
            </button>
            <button
              type="button"
              onClick={() => switchDemoUser('admin')}
              className="text-[11px] font-bold px-2 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              Admin Demo
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'forgot' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail cadastrado
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: maria.silva@exemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Informe a nova senha"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                </div>
              </div>
            </>
          ) : authModalTab === 'login' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail do Cidadão ou Administrador
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maria.silva@exemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                    }}
                    className="text-xs text-[#1E6FB8] hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Maria Aparecida da Silva"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone de Contato (WhatsApp para avisos)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Crie uma Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-snug">
                🔒 <strong>Sem burocracia:</strong> Em conformidade com as regras do projeto, não solicitamos CPF, número do Cartão SUS (CNS) nem comprovante de endereço.
              </p>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#1E6FB8] hover:bg-[#0D47A1] text-white font-bold rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {loading
              ? 'Processando...'
              : mode === 'forgot'
              ? 'Salvar Nova Senha'
              : authModalTab === 'login'
              ? 'Entrar no Sistema'
              : 'Confirmar Cadastro'}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('auth')}
              className="w-full text-center text-xs text-slate-600 hover:text-slate-900 cursor-pointer pt-1"
            >
              Voltar para o Login
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
