import React, { useState, useEffect } from 'react';
import {
  isSupabaseConfigured,
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from '../lib/supabase.ts';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Key,
} from 'lucide-react';

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConnectionModal: React.FC<SupabaseConnectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [urlInput, setUrlInput] = useState(config.url.includes('SUA_PROJECT_URL') ? '' : config.url);
  const [keyInput, setKeyInput] = useState(config.key.includes('SUA_PUBLISHABLE_KEY') ? '' : config.key);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
    count?: number;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setConfig(cfg);
      setUrlInput(cfg.url.includes('SUA_PROJECT_URL') ? '' : cfg.url);
      setKeyInput(cfg.key.includes('SUA_PUBLISHABLE_KEY') ? '' : cfg.key);
      setFormError(null);
      setShowResetConfirm(false);
      handleTest(false);
    }
  }, [isOpen]);

  const handleTest = async (_explicit: boolean = true, custom?: { url: string; key: string }) => {
    setTesting(true);
    setTestResult(null);
    setFormError(null);
    try {
      const res = await testSupabaseConnection(custom);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || 'Erro inesperado ao testar conexão com Supabase.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTestInputs = () => {
    if (!urlInput.trim() || !keyInput.trim()) {
      setFormError('Preencha a Project URL e a Anon Key antes de testar.');
      return;
    }
    handleTest(true, { url: urlInput, key: keyInput });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      setFormError('Informe a Project URL e a chave pública (Anon Key).');
      return;
    }
    setFormError(null);
    saveSupabaseConfig(urlInput, keyInput);
  };

  const handleReset = () => {
    clearSupabaseConfig();
    setShowResetConfirm(false);
  };

  const handleCopySql = () => {
    fetch('/supabase_schema.sql')
      .then((r) => r.text())
      .then((sql) => {
        navigator.clipboard.writeText(sql);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2000);
      })
      .catch(() => {
        // Fallback
        navigator.clipboard.writeText('-- Script disponível no arquivo supabase_schema.sql');
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2000);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D47A1] via-[#1E6FB8] to-[#00A884] p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <Database className="w-5 h-5 text-emerald-300" />
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-200">
              Banco de Dados & Autenticação
            </span>
          </div>
          <h3 className="text-xl font-bold tracking-tight">
            Conexão com o Supabase (PostgreSQL)
          </h3>
          <p className="text-xs text-blue-100 mt-1">
            Integração nativa com `@supabase/supabase-js`, políticas RLS, 12 áreas e 90 profissionais.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
              testResult?.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : config.isConfigured
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              {testResult?.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold text-sm block">
                  {testResult?.ok
                    ? 'Supabase Conectado e Operacional'
                    : config.isConfigured
                    ? 'Credenciais Detectadas — Testando Conexão'
                    : 'Aguardando Configuração do Supabase'}
                </span>
                <p className="text-xs leading-relaxed">
                  {testResult?.message ||
                    (config.isConfigured
                      ? 'Testando comunicação com o banco de dados...'
                      : 'Insira sua Project URL e sua Anon Key abaixo ou no arquivo .env para conectar.')}
                </p>
                {testResult?.latencyMs !== undefined && (
                  <span className="text-[11px] font-mono text-emerald-700 block font-semibold">
                    Latência do banco: {testResult.latencyMs}ms · {testResult.count ?? 12} especialidades catalogadas
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleTest(true)}
              disabled={testing || !config.isConfigured}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>Testar Conexão</span>
            </button>
          </div>

          {/* Form to paste/update credentials */}
          <form onSubmit={handleSave} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-[#1E6FB8]" />
              <span>Parâmetros de Conexão (Chaves Públicas)</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                VITE_SUPABASE_URL (Project URL)
              </label>
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://seu-projeto.supabase.co"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                VITE_SUPABASE_ANON_KEY (Chave Pública / Anon Key)
              </label>
              <input
                type="text"
                required
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                🔒 <strong>Regra de Segurança:</strong> Utilize exclusivamente a chave <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">anon public</code>. Nunca insira a chave <code className="text-rose-700 font-bold">service_role</code> no frontend.
              </span>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestInputs}
                  disabled={testing}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer border border-slate-300 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>Testar Parâmetros</span>
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1E6FB8] hover:bg-[#0D47A1] text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Salvar e Conectar
                </button>
              </div>

              {config.isConfigured && !showResetConfirm && (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  Limpar chaves salvas
                </button>
              )}

              {showResetConfirm && (
                <div className="flex items-center gap-2 text-xs bg-rose-50 p-2 rounded-lg border border-rose-200">
                  <span className="text-rose-700 font-medium">Confirmar remoção?</span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700"
                  >
                    Sim, Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px] hover:bg-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* SQL Script Step */}
          <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">
                  Estrutura SQL Oficial (`supabase_schema.sql`)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Script pronto com as 6 tabelas, políticas RLS, as 12 áreas e os 90 profissionais.
                </p>
              </div>

              <button
                onClick={handleCopySql}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar SQL Completo'}</span>
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-300 space-y-1">
              <p className="text-emerald-400 font-bold">-- Resumo da Estrutura Preparada:</p>
              <p>✓ Tabela <strong>public.profiles</strong> (integrada ao auth.users com trigger)</p>
              <p>✓ Tabela <strong>public.specialties</strong> (12 áreas cadastradas)</p>
              <p>✓ Tabela <strong>public.professionals</strong> (90 médicos e psicólogos fictícios)</p>
              <p>✓ Tabela <strong>public.appointments</strong> (agendamentos e teleconsultas)</p>
              <p>✓ Tabela <strong>public.demonstrative_documents</strong> (receitas e atestados)</p>
              <p>✓ Tabela <strong>public.webhook_logs</strong> (histórico n8n e Telegram)</p>
              <p>✓ Políticas RLS habilitadas para proteção de privacidade</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 px-6 border-t border-slate-200 flex items-center justify-between shrink-0 text-slate-500 text-xs">
          <span>SUS CONECT · Conexão Supabase Oficial</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
