import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve Supabase credentials with priority:
// 1. import.meta.env (Vite environment variables)
// 2. localStorage override (allows immediate testing in UI if user pastes URL/Anon key)
const getCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('sus_conect_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('sus_conect_supabase_key') : null;

  const url = (localUrl || envUrl || '').trim();
  const key = (localKey || envKey || '').trim();

  const isConfigured =
    url.length > 0 &&
    key.length > 0 &&
    !url.includes('SUA_PROJECT_URL') &&
    !url.includes('your-project') &&
    !key.includes('SUA_PUBLISHABLE_KEY') &&
    !key.includes('your-anon');

  return { url, key, isConfigured };
};

const credentials = getCredentials();

// Dummy fallback client to prevent undefined property crashes when unconfigured
const dummyClient = createClient(
  credentials.isConfigured ? credentials.url : 'https://placeholder-susconect.supabase.co',
  credentials.isConfigured ? credentials.key : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const supabase: SupabaseClient = dummyClient;

export function isSupabaseConfigured(): boolean {
  return getCredentials().isConfigured;
}

export function getSupabaseConfig() {
  return getCredentials();
}

export function saveSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sus_conect_supabase_url', url.trim());
    localStorage.setItem('sus_conect_supabase_key', key.trim());
    window.location.reload();
  }
}

export function clearSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sus_conect_supabase_url');
    localStorage.removeItem('sus_conect_supabase_key');
    window.location.reload();
  }
}

/**
 * Tests live connection to Supabase database.
 * Attempts to query the `specialties` table or `profiles`.
 */
export async function testSupabaseConnection(customConfig?: { url: string; key: string }): Promise<{
  ok: boolean;
  message: string;
  latencyMs?: number;
  count?: number;
}> {
  const targetUrl = (customConfig?.url || getCredentials().url || '').trim();
  const targetKey = (customConfig?.key || getCredentials().key || '').trim();

  const isConfigured =
    targetUrl.length > 0 &&
    targetKey.length > 0 &&
    !targetUrl.includes('SUA_PROJECT_URL') &&
    !targetUrl.includes('your-project') &&
    !targetKey.includes('SUA_PUBLISHABLE_KEY') &&
    !targetKey.includes('your-anon');

  if (!isConfigured) {
    return {
      ok: false,
      message: 'Supabase não está configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env ou no painel.',
    };
  }

  const start = performance.now();
  try {
    const client = createClient(targetUrl, targetKey);
    const { data, error, count } = await client
      .from('specialties')
      .select('id, name', { count: 'exact', head: false })
      .limit(5);

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      // If table does not exist yet
      if (error.code === '42P01' || error.message.includes('relation "public.specialties" does not exist')) {
        return {
          ok: false,
          message: `Conexão autenticada ao Supabase com sucesso (${latencyMs}ms), porém as tabelas ainda não foram criadas. Execute o script 'supabase_schema.sql' no SQL Editor do Supabase.`,
          latencyMs,
        };
      }
      return {
        ok: false,
        message: `Supabase retornou erro: [${error.code || 'ERRO'}] ${error.message}`,
        latencyMs,
      };
    }

    return {
      ok: true,
      message: `Conexão bem-sucedida ao Supabase! ${data?.length || 0} especialidades consultadas em tempo real.`,
      latencyMs,
      count: count ?? data?.length,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Falha ao tentar se conectar ao Supabase: ${err.message || 'Erro de rede'}`,
    };
  }
}
