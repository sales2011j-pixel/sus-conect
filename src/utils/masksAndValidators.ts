/**
 * SUS CONECT — Funções de Máscara, Validação e Consulta de CEP (ViaCEP)
 * Formação Geração Tech 4.0
 */

// ==========================================
// 1. MÁSCARAS E FORMATAÇÃO
// ==========================================

export function formatCPF(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

export function formatCartaoSUS(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 15);
  if (clean.length <= 3) return clean;
  if (clean.length <= 7) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  if (clean.length <= 11) return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
  return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7, 11)} ${clean.slice(11, 15)}`;
}

export function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 2) return clean ? `(${clean}` : '';
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
}

export function formatCEP(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 8);
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
}

// ==========================================
// 2. MÁSCARAS DE PRIVACIDADE (LGPD)
// ==========================================

/**
 * Mascara o CPF para exibição segura em telas públicas ou no painel:
 * Exemplo: 123.456.789-00 -> ***.456.789-** ou ***.***.789-00
 */
export function maskCPFForDisplay(cpf: string | undefined): string {
  if (!cpf) return 'Não cadastrado';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return '***.***.***-**';
  return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
}

/**
 * Mascara o Cartão SUS para exibição segura:
 * Exemplo: 700 1234 5678 9012 -> *** **** **** 9012
 */
export function maskCartaoSUSForDisplay(sus: string | undefined): string {
  if (!sus) return 'Não cadastrado';
  const clean = sus.replace(/\D/g, '');
  if (clean.length !== 15) return '*** **** **** ****';
  return `*** **** **** ${clean.slice(11, 15)}`;
}

// ==========================================
// 3. VALIDAÇÕES OFICIAIS
// ==========================================

/**
 * Validação algorítmica oficial dos 2 dígitos verificadores do CPF.
 * Rejeita repetições conhecidas (ex: 111.111.111-11).
 */
export function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Validação do Cartão Nacional de Saúde (CNS / Cartão SUS).
 * O CNS possui exatamente 15 dígitos numéricos e não pode ser composto por dígitos nulos.
 */
export function isValidCartaoSUS(sus: string): boolean {
  const clean = sus.replace(/\D/g, '');
  if (clean.length !== 15) return false;
  if (/^(\d)\1{14}$/.test(clean)) return false;
  return true;
}

// ==========================================
// 4. INTEGRAÇÃO VIACEP
// ==========================================

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

export async function fetchAddressByCEP(rawCep: string): Promise<{
  success: boolean;
  data?: ViaCepResponse;
  error?: string;
}> {
  const cleanCep = rawCep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    return { success: false, error: 'O CEP deve conter exatamente 8 dígitos.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        error: `Serviço ViaCEP indisponível (HTTP ${res.status}). Você pode digitar o endereço manualmente.`,
      };
    }

    const data: ViaCepResponse = await res.json();
    if (data.erro) {
      return {
        success: false,
        error: 'CEP não localizado na base nacional. Por favor, confira o número ou preencha o endereço manualmente.',
      };
    }

    return { success: true, data };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'A consulta de CEP demorou para responder. Preencha seu endereço manualmente abaixo.',
      };
    }
    return {
      success: false,
      error: 'Não foi possível conectar ao serviço de CEP no momento. Preencha manualmente os campos.',
    };
  }
}
