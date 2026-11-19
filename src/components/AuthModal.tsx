import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  CheckCircle,
  ShieldAlert,
  Sparkles,
  CreditCard,
  FileText,
  MapPin,
  Home,
  Building,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '../services/api.ts';
import {
  formatCPF,
  formatCartaoSUS,
  formatPhone,
  formatCEP,
  isValidCPF,
  isValidCartaoSUS,
  fetchAddressByCEP,
  maskCPFForDisplay,
  maskCartaoSUSForDisplay,
} from '../utils/masksAndValidators.ts';
import { RegisterData } from '../types/index.ts';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    setAuthModalTab,
    login,
    register,
    switchDemoUser,
  } = useAuth();

  const [mode, setMode] = useState<'auth' | 'forgot'>('auth');
  const [showPassword, setShowPassword] = useState(false);

  // Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Password Recovery States
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');

  // Registration Wizard Step (1: Identificação, 2: Endereço, 3: Confirmação)
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);

  // Step 1: Identificação
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [susCard, setSusCard] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: Endereço
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // ViaCEP Status
  const [cepLoading, setCepLoading] = useState(false);
  const [cepNotice, setCepNotice] = useState<string | null>(null);

  // LGPD consent
  const [lgpdAccepted, setLgpdAccepted] = useState(true);

  // General Form States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  // Handles CEP changes and triggers automatic ViaCEP lookup at 8 digits
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setCep(formatted);
    setCepNotice(null);

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      setCepLoading(true);
      const res = await fetchAddressByCEP(clean);
      setCepLoading(false);

      if (res.success && res.data) {
        setStreet(res.data.logradouro || '');
        setNeighborhood(res.data.bairro || '');
        setCity(res.data.localidade || '');
        setState(res.data.uf || '');
        setCepNotice('Endereço preenchido automaticamente pelo CEP.');
      } else {
        setCepNotice(res.error || 'CEP não localizado. Preencha os campos manualmente.');
      }
    }
  };

  // Step 1 Validation
  const handleProceedToStep2 = () => {
    setError(null);
    if (!name.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }
    if (!cpf || !isValidCPF(cpf)) {
      setError('CPF inválido. Por favor, verifique os 11 dígitos informados.');
      return;
    }
    if (!susCard || !isValidCartaoSUS(susCard)) {
      setError('Cartão Nacional de Saúde (Cartão SUS) deve conter exatamente 15 dígitos numéricos.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Por favor, informe um telefone de contato válido com DDD.');
      return;
    }
    if (!password || password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setRegStep(2);
  };

  // Step 2 Validation
  const handleProceedToStep3 = () => {
    setError(null);
    if (!cep || cep.replace(/\D/g, '').length !== 8) {
      setError('Por favor, informe um CEP válido com 8 dígitos.');
      return;
    }
    if (!street.trim()) {
      setError('Por favor, informe a rua ou logradouro.');
      return;
    }
    if (!number.trim()) {
      setError('Por favor, informe o número da residência (ou "S/N").');
      return;
    }
    if (!neighborhood.trim()) {
      setError('Por favor, informe o bairro.');
      return;
    }
    if (!city.trim() || !state.trim()) {
      setError('Por favor, informe a cidade e o estado (UF).');
      return;
    }

    setRegStep(3);
  };

  // Final Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const res = await api.resetPassword(recoveryEmail, recoveryNewPassword);
        setSuccessMsg(res.message);
        setTimeout(() => {
          setMode('auth');
          setAuthModalTab('login');
          setSuccessMsg(null);
        }, 1500);
      } else if (authModalTab === 'login') {
        await login(loginEmail, loginPassword);
      } else {
        if (!lgpdAccepted) {
          setError('É necessário aceitar os termos de consentimento e privacidade para concluir o cadastro.');
          setLoading(false);
          return;
        }

        const payload: RegisterData = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          cpf: cpf.trim(),
          susCard: susCard.trim(),
          cep: cep.trim(),
          street: street.trim(),
          number: number.trim(),
          complement: complement.trim(),
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
        };

        await register(payload);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden relative animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1E6FB8] to-[#0D47A1] p-5 sm:p-6 text-white relative shrink-0">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-300 bg-white/10 px-2 py-0.5 rounded-full">
              SUS CONECT • Telemedicina Integrada
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight">
            {mode === 'forgot'
              ? 'Recuperar Senha de Acesso'
              : authModalTab === 'login'
              ? 'Acesse sua Conta no SUS CONECT'
              : 'Novo Cadastro do Cidadão'}
          </h3>
          <p className="text-xs text-blue-100 mt-1">
            {mode === 'forgot'
              ? 'Defina uma nova senha para acessar seus atendimentos.'
              : authModalTab === 'login'
              ? 'Consulte seus agendamentos, teleconsultas e receitas digitais.'
              : 'Identificação oficial com CPF, Cartão SUS e endereço com busca automática por CEP.'}
          </p>
        </div>

        {/* Tab switchers if not in forgot mode */}
        {mode === 'auth' && (
          <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
            <button
              type="button"
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
              Já tenho cadastro (Entrar)
            </button>
            <button
              type="button"
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
              Novo Cadastro Ampliado
            </button>
          </div>
        )}

        {/* Fast Evaluation committee Demo Fill */}
        <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#0D47A1] font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#1E6FB8] shrink-0" />
            <span className="text-[11px] font-semibold">Acesso Rápido para a Banca:</span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => switchDemoUser('citizen')}
              className="text-[10px] font-bold px-2 py-1 bg-white text-[#1E6FB8] hover:bg-blue-100 rounded-md border border-blue-200 shadow-2xs transition-colors cursor-pointer"
            >
              Cidadão Demo
            </button>
            <button
              type="button"
              onClick={() => switchDemoUser('admin')}
              className="text-[10px] font-bold px-2 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              Admin Demo
            </button>
          </div>
        </div>

        {/* Registration Steps Indicator */}
        {mode === 'auth' && authModalTab === 'register' && (
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  regStep === 1
                    ? 'bg-[#1E6FB8] text-white'
                    : regStep > 1
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {regStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </span>
              <span className={`text-xs font-semibold ${regStep === 1 ? 'text-[#1E6FB8]' : 'text-slate-600'}`}>
                Identificação
              </span>
            </div>
            <div className="h-0.5 w-6 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  regStep === 2
                    ? 'bg-[#1E6FB8] text-white'
                    : regStep > 2
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {regStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </span>
              <span className={`text-xs font-semibold ${regStep === 2 ? 'text-[#1E6FB8]' : 'text-slate-600'}`}>
                Endereço
              </span>
            </div>
            <div className="h-0.5 w-6 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  regStep === 3
                    ? 'bg-[#1E6FB8] text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                3
              </span>
              <span className={`text-xs font-semibold ${regStep === 3 ? 'text-[#1E6FB8]' : 'text-slate-600'}`}>
                Confirmação
              </span>
            </div>
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
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
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="maria.silva@exemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nova Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={recoveryNewPassword}
                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#1E6FB8] hover:bg-[#0D47A1] text-white font-bold rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {loading ? 'Processando...' : 'Salvar Nova Senha'}
              </button>
              <button
                type="button"
                onClick={() => setMode('auth')}
                className="w-full text-center text-xs text-slate-600 hover:text-slate-900 cursor-pointer pt-1"
              >
                Voltar para o Login
              </button>
            </>
          ) : authModalTab === 'login' ? (
            /* LOGIN FORM */
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
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
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
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#1E6FB8] hover:bg-[#0D47A1] text-white font-bold rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50 shadow-xs mt-2"
              >
                {loading ? 'Entrando...' : 'Entrar no SUS CONECT'}
              </button>
            </>
          ) : (
            /* REGISTRATION WIZARD */
            <>
              {/* ETAPA 1: IDENTIFICAÇÃO PESSOAL */}
              {regStep === 1 && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">CPF *</label>
                        {cpf && (
                          <span
                            className={`text-[10px] font-bold ${
                              isValidCPF(cpf) ? 'text-emerald-600' : 'text-rose-500'
                            }`}
                          >
                            {isValidCPF(cpf) ? 'Dígitos Válidos' : 'Formato incorreto'}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={cpf}
                          onChange={(e) => setCpf(formatCPF(e.target.value))}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">Cartão SUS (CNS) *</label>
                        {susCard && (
                          <span
                            className={`text-[10px] font-bold ${
                              isValidCartaoSUS(susCard) ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            {isValidCartaoSUS(susCard) ? '15 dígitos' : `${susCard.replace(/\D/g, '').length}/15`}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={susCard}
                          onChange={(e) => setSusCard(formatCartaoSUS(e.target.value))}
                          placeholder="000 0000 0000 0000"
                          maxLength={18}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-tight">
                    ℹ️ <em>Validação de formato algorítmico sem consulta a bases governamentais restritas (projeto acadêmico).</em>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        E-mail *
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
                        Telefone / WhatsApp *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(formatPhone(e.target.value))}
                          placeholder="(11) 98765-4321"
                          maxLength={15}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Crie uma Senha de Acesso *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleProceedToStep2}
                      className="w-full py-2.5 px-4 bg-[#1E6FB8] hover:bg-[#0D47A1] text-white font-bold rounded-lg text-sm transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                    >
                      <span>Avançar para Endereço</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ETAPA 2: ENDEREÇO RESIDENCIAL & VIACEP */}
              {regStep === 2 && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-[#0D47A1]">
                    <div className="flex items-center gap-1.5 font-bold mb-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#1E6FB8]" />
                      <span>Preenchimento Automático via CEP:</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Informe os 8 dígitos do CEP para auto-completar a rua, bairro, cidade e estado pela API ViaCEP. Todos os campos continuam editáveis.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">CEP *</label>
                        {cepLoading && (
                          <span className="flex items-center gap-1 text-[10px] text-[#1E6FB8]">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Buscando...</span>
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Home className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={cep}
                          onChange={handleCepChange}
                          placeholder="00000-000"
                          maxLength={9}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Número *
                      </label>
                      <input
                        type="text"
                        required
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="Ex: 123 ou S/N"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                      />
                    </div>
                  </div>

                  {cepNotice && (
                    <p className="text-[11px] text-[#1E6FB8] font-medium bg-blue-50/50 px-2 py-1 rounded">
                      {cepNotice}
                    </p>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rua ou Avenida (Logradouro) *
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Ex: Av. Paulista ou Rua das Flores"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Complemento (Opcional)
                      </label>
                      <input
                        type="text"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        placeholder="Apto 42, Bloco B, Casa 2"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bairro *
                      </label>
                      <input
                        type="text"
                        required
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Bairro ou Distrito"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Cidade"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Estado (UF) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                        placeholder="SP"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-center uppercase focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="w-1/3 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToStep3}
                      className="w-2/3 py-2.5 px-4 bg-[#1E6FB8] hover:bg-[#0D47A1] text-white font-bold rounded-lg text-sm transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                    >
                      <span>Avançar para Revisão</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ETAPA 3: REVISÃO DOS DADOS & LGPD */}
              {regStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                    <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                      <span>Resumo Cadastral do Cidadão</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                        Dados Protegidos
                      </span>
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Nome Completo:</span>
                        <strong className="text-slate-800">{name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">E-mail:</span>
                        <strong className="text-slate-800 font-mono">{email}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">CPF (Mascarado):</span>
                        <strong className="text-slate-800 font-mono">{maskCPFForDisplay(cpf)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cartão SUS (Mascarado):</span>
                        <strong className="text-slate-800 font-mono">{maskCartaoSUSForDisplay(susCard)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Telefone:</span>
                        <strong className="text-slate-800 font-mono">{phone}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">CEP:</span>
                        <strong className="text-slate-800 font-mono">{cep}</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 block">Endereço Residencial:</span>
                        <strong className="text-slate-800">
                          {street}, {number} {complement ? `(${complement})` : ''} - {neighborhood}, {city}/{state}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* LGPD Privacy Warning */}
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-[#0D47A1] space-y-1.5 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#0D47A1]">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Termo de Privacidade e Proteção de Dados (LGPD)</span>
                    </div>
                    <p className="text-slate-700">
                      Os dados fornecidos têm finalidade estritamente acadêmica de identificação e simulação de teleconsultas no projeto <strong>SUS CONECT (Formação Geração Tech 4.0)</strong>. Em respeito à Lei Geral de Proteção de Dados (LGPD):
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[10px]">
                      <li>Identificadores pessoais (CPF e Cartão SUS) são mascarados na interface pública.</li>
                      <li>Não há compartilhamento com terceiros nem bases externas não autorizadas.</li>
                      <li>Não existe cobrança ou substituição de atendimento médico de emergência.</li>
                    </ul>

                    <label className="flex items-start gap-2 pt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lgpdAccepted}
                        onChange={(e) => setLgpdAccepted(e.target.checked)}
                        className="mt-0.5 rounded text-[#1E6FB8] focus:ring-[#1E6FB8] cursor-pointer"
                      />
                      <span className="text-[11px] text-slate-800 font-semibold">
                        Li e concordo com os termos de uso e a política de privacidade do SUS CONECT.
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(2)}
                      className="w-1/3 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !lgpdAccepted}
                      className="w-2/3 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Finalizando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Finalizar Cadastro</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
};
