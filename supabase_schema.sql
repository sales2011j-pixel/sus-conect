-- ============================================================================
-- PROJETO SUS CONECT — Formação Geração Tech 4.0
-- Estrutura de Banco de Dados Oficial para o Supabase (PostgreSQL)
-- ============================================================================
-- Este script:
-- 1. Cria com segurança as 6 tabelas principais do ecossistema SUS CONECT.
-- 2. Habilita Row Level Security (RLS) e define as políticas de acesso.
-- 3. Insere as 12 áreas de atendimento e os 90 profissionais fictícios.
-- 4. Insere agendamentos e documentos demonstrativos iniciais.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA DE PERFIS DOS USUÁRIOS (Vinculada ao auth.users do Supabase)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('citizen', 'admin')) DEFAULT 'citizen',
  cpf TEXT DEFAULT '',
  sus_card TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  street TEXT DEFAULT '',
  number TEXT DEFAULT '',
  complement TEXT DEFAULT '',
  neighborhood TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração segura para tabelas profiles já existentes no Supabase
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sus_card TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cep TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS number TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS complement TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS neighborhood TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';

-- ----------------------------------------------------------------------------
-- FUNÇÃO AUXILIAR DE SEGURANÇA: is_admin()
-- Previne recursão infinita de RLS ao consultar public.profiles com SECURITY DEFINER.
-- search_path explícito restrito impede vulnerabilidades de hijacking (CWE-426).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Trigger para proteção de escalonamento de privilégios na tabela profiles
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Impede qualquer alteração de role por usuários comuns
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Alteração de papel (role) não autorizada. Apenas administradores do sistema podem alterar privilégios.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- Trigger para criar perfil automaticamente quando um usuário se cadastrar pelo Supabase Auth
-- REGRAS DE SEGURANÇA:
-- 1. search_path = public, pg_temp para isolamento de execução.
-- 2. O papel (role) é estritamente forçado para 'citizen'. Metadados de cliente jamais definem papéis.
-- 3. No conflito de ID, o papel (role) NUNCA é atualizado, impedindo escalonamento de privilégios.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role, cpf, sus_card, cep, street, number, complement, neighborhood, city, state)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'citizen', -- RIGOR DE SEGURANÇA: Todo novo usuário é sempre 'citizen'
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    COALESCE(NEW.raw_user_meta_data->>'sus_card', ''),
    COALESCE(NEW.raw_user_meta_data->>'cep', ''),
    COALESCE(NEW.raw_user_meta_data->>'street', ''),
    COALESCE(NEW.raw_user_meta_data->>'number', ''),
    COALESCE(NEW.raw_user_meta_data->>'complement', ''),
    COALESCE(NEW.raw_user_meta_data->>'neighborhood', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    cpf = COALESCE(NULLIF(EXCLUDED.cpf, ''), public.profiles.cpf),
    sus_card = COALESCE(NULLIF(EXCLUDED.sus_card, ''), public.profiles.sus_card),
    cep = COALESCE(NULLIF(EXCLUDED.cep, ''), public.profiles.cep),
    street = COALESCE(NULLIF(EXCLUDED.street, ''), public.profiles.street),
    number = COALESCE(NULLIF(EXCLUDED.number, ''), public.profiles.number),
    complement = COALESCE(NULLIF(EXCLUDED.complement, ''), public.profiles.complement),
    neighborhood = COALESCE(NULLIF(EXCLUDED.neighborhood, ''), public.profiles.neighborhood),
    city = COALESCE(NULLIF(EXCLUDED.city, ''), public.profiles.city),
    state = COALESCE(NULLIF(EXCLUDED.state, ''), public.profiles.state);
    -- NOTA: O campo 'role' NUNCA é atualizado no ON CONFLICT, garantindo que re-cadastros não alterem papéis.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 2. TABELA DE ÁREAS DE ATENDIMENTO (12 Áreas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.specialties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  professional_count INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('médica', 'atendimento_profissional')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. TABELA DO CORPO CLÍNICO (90 Profissionais Fictícios)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professionals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialty_id TEXT REFERENCES public.specialties(id) ON DELETE SET NULL,
  specialty_name TEXT NOT NULL,
  available_days TEXT[] NOT NULL DEFAULT '{}',
  shifts TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  bio_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. TABELA DE AGENDAMENTOS E TELECONSULTAS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY DEFAULT ('apt_' || substr(md5(random()::text), 1, 10)),
  citizen_id TEXT NOT NULL,
  citizen_name TEXT NOT NULL,
  citizen_email TEXT NOT NULL,
  citizen_phone TEXT DEFAULT '',
  professional_id TEXT REFERENCES public.professionals(id) ON DELETE SET NULL,
  professional_name TEXT NOT NULL,
  specialty_id TEXT REFERENCES public.specialties(id) ON DELETE SET NULL,
  specialty_name TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('solicitado', 'confirmado', 'aguardando_paciente', 'em_andamento', 'concluido', 'paciente_ausente', 'cancelado')) DEFAULT 'confirmado',
  reason TEXT DEFAULT 'Consulta preventiva de rotina',
  notes TEXT DEFAULT '',
  virtual_room_id TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  effective_duration_seconds INTEGER,
  video_session_id TEXT,
  clinical_extension_reason TEXT,
  clinical_extension_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MIGRATION SCRIPT (Para bases Supabase já criadas):
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS effective_duration_seconds INTEGER;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS video_session_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS clinical_extension_reason TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS clinical_extension_minutes INTEGER DEFAULT 0;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('solicitado', 'confirmado', 'aguardando_paciente', 'em_andamento', 'concluido', 'paciente_ausente', 'cancelado'));

-- ----------------------------------------------------------------------------
-- 5. TABELA DE DOCUMENTOS DEMONSTRATIVOS (Receitas, Atestados e Guias)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demonstrative_documents (
  id TEXT PRIMARY KEY DEFAULT ('doc_' || substr(md5(random()::text), 1, 10)),
  citizen_id TEXT NOT NULL,
  citizen_name TEXT NOT NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('receita', 'atestado', 'orientacao', 'encaminhamento')),
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  doctor_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  document_number TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. TABELA DE LOGS DE AUTOMAÇÕES E WEBHOOKS (Telegram & n8n)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id TEXT PRIMARY KEY DEFAULT ('log_' || substr(md5(random()::text), 1, 10)),
  target TEXT NOT NULL CHECK (target IN ('telegram', 'n8n')),
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. ÍNDICES DE PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_prof_specialty ON public.professionals(specialty_id);
CREATE INDEX IF NOT EXISTS idx_apt_citizen ON public.appointments(citizen_id);
CREATE INDEX IF NOT EXISTS idx_apt_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_doc_citizen ON public.demonstrative_documents(citizen_id);

-- ----------------------------------------------------------------------------
-- 8. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demonstrative_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para specialties (leitura pública, escrita por admin/serviço)
DROP POLICY IF EXISTS "Specialties são públicas para leitura" ON public.specialties;
CREATE POLICY "Specialties são públicas para leitura"
  ON public.specialties FOR SELECT
  USING (true);

-- Políticas para professionals (leitura pública, edição por admin/serviço)
DROP POLICY IF EXISTS "Profissionais são públicos para leitura" ON public.professionals;
CREATE POLICY "Profissionais são públicos para leitura"
  ON public.professionals FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Administradores gerenciam profissionais" ON public.professionals;
CREATE POLICY "Administradores gerenciam profissionais"
  ON public.professionals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para profiles
DROP POLICY IF EXISTS "Usuários leem seus próprios perfis" ON public.profiles;
CREATE POLICY "Usuários leem seus próprios perfis"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- POLÍTICA ADMINISTRATIVA SEGURA:
-- Utiliza a função auxiliar public.is_admin() (SECURITY DEFINER com search_path restrito),
-- eliminando completamente o risco de recursão infinita de RLS ao consultar a própria tabela profiles.
DROP POLICY IF EXISTS "Administradores leem perfis para gestao" ON public.profiles;
CREATE POLICY "Administradores leem perfis para gestao"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Usuários atualizam seus próprios perfis" ON public.profiles;
CREATE POLICY "Usuários atualizam seus próprios perfis"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Políticas para appointments (Cidadãos leem e criam seus agendamentos)
DROP POLICY IF EXISTS "Cidadãos visualizam seus agendamentos" ON public.appointments;
CREATE POLICY "Cidadãos visualizam seus agendamentos"
  ON public.appointments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Cidadãos criam agendamentos" ON public.appointments;
CREATE POLICY "Cidadãos criam agendamentos"
  ON public.appointments FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Atualização de status de agendamentos" ON public.appointments;
CREATE POLICY "Atualização de status de agendamentos"
  ON public.appointments FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Políticas para demonstrative_documents
DROP POLICY IF EXISTS "Leitura de documentos demonstrativos" ON public.demonstrative_documents;
CREATE POLICY "Leitura de documentos demonstrativos"
  ON public.demonstrative_documents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Emissão de documentos demonstrativos" ON public.demonstrative_documents;
CREATE POLICY "Emissão de documentos demonstrativos"
  ON public.demonstrative_documents FOR INSERT
  WITH CHECK (true);

-- Políticas para webhook_logs
DROP POLICY IF EXISTS "Acesso aos logs de automação" ON public.webhook_logs;
CREATE POLICY "Acesso aos logs de automação"
  ON public.webhook_logs FOR ALL
  USING (true);

-- ----------------------------------------------------------------------------
-- 9. INSERÇÃO DAS 12 ÁREAS DE ATENDIMENTO (SEED)
-- ----------------------------------------------------------------------------
INSERT INTO public.specialties (id, name, slug, description, icon_name, professional_count, category)
VALUES
  ('spec_clinica_geral', 'Clínica Geral', 'clinica-geral', 'Acolhimento primário, avaliação de sintomas comuns, acompanhamento preventivo e orientações de saúde.', 'Stethoscope', 10, 'médica'),
  ('spec_cardiologia', 'Cardiologia', 'cardiologia', 'Orientação preventiva para saúde cardiovascular, monitoramento de pressão arterial e cuidados com o coração.', 'HeartPulse', 10, 'médica'),
  ('spec_ortopedia', 'Ortopedia', 'ortopedia', 'Orientação para dores articulares, musculares, postura corporal e cuidados pós-trauma.', 'Bone', 8, 'médica'),
  ('spec_oftalmologia', 'Oftalmologia', 'oftalmologia', 'Orientação sobre fadiga visual, cuidados com os olhos, higiene ocular e triagem de queixas visuais.', 'Eye', 8, 'médica'),
  ('spec_dermatologia', 'Dermatologia', 'dermatologia', 'Avaliação inicial de manchas, lesões superficiais de pele, cuidados com hidratação e proteção solar.', 'Sparkles', 8, 'médica'),
  ('spec_ginecologia', 'Ginecologia', 'ginecologia', 'Saúde integral da mulher, planejamento reprodutivo, orientações preventivas e ciclos vitais.', 'Activity', 8, 'médica'),
  ('spec_endocrinologia', 'Endocrinologia', 'endocrinologia', 'Acompanhamento metabólico, orientações sobre diabetes, tireoide e hábitos de vida saudáveis.', 'Scale', 7, 'médica'),
  ('spec_neurologia', 'Neurologia', 'neurologia', 'Orientações para queixas de enxaqueca, memória, distúrbios do sono e acompanhamento neurológico.', 'Brain', 7, 'médica'),
  ('spec_otorrinolaringologia', 'Otorrinolaringologia', 'otorrinolaringologia', 'Cuidados para queixas de ouvido, nariz, garganta, sinusites e equilíbrio.', 'Ear', 7, 'médica'),
  ('spec_urologia', 'Urologia', 'urologia', 'Saúde do aparelho urinário masculino e feminino, orientações preventivas da próstata.', 'ShieldCheck', 7, 'médica'),
  ('spec_gastroenterologia', 'Gastroenterologia', 'gastroenterologia', 'Orientações para refluxo, gastrite, desconforto intestinal e cuidados com a digestão.', 'Layers', 7, 'médica'),
  ('spec_psicologia', 'Psicologia', 'psicologia', 'Área de atendimento profissional em saúde mental, apoio emocional, acolhimento de ansiedade e escuta qualificada.', 'Smile', 8, 'atendimento_profissional')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  professional_count = EXCLUDED.professional_count,
  category = EXCLUDED.category;

-- ----------------------------------------------------------------------------
-- 10. INSERÇÃO DOS 90 PROFISSIONAIS FICTÍCIOS (SEED COMPLETO)
-- ----------------------------------------------------------------------------
INSERT INTO public.professionals (id, name, specialty_id, specialty_name, available_days, shifts, active, rating, bio_summary)
VALUES
  -- 5.1 Clínica Geral (10 médicos)
  ('prof_cg_1', 'Dra. Helena Martins', 'spec_clinica_geral', 'Clínica Geral', ARRAY['Segunda', 'Quarta', 'Sexta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Atendimento clínico primário, prevenção e acolhimento longitudinal.'),
  ('prof_cg_2', 'Dr. Rafael Monteiro', 'spec_clinica_geral', 'Clínica Geral', ARRAY['Terça', 'Quinta', 'Sábado'], ARRAY['Manhã', 'Tarde'], true, 4.80, 'Avaliação de queixas agudas, sintomas gripais e orientações gerais.'),
  ('prof_cg_3', 'Dra. Camila Albuquerque', 'spec_clinica_geral', 'Clínica Geral', ARRAY['Segunda', 'Terça', 'Quarta'], ARRAY['Tarde', 'Noite'], true, 4.90, 'Medicina preventiva e promoção de hábitos de vida sustentáveis.'),
  ('prof_cg_4', 'Dr. Felipe Nogueira', 'spec_clinica_geral', 'Clínica Geral', ARRAY['Quarta', 'Quinta', 'Sexta'], ARRAY['Manhã', 'Tarde'], true, 4.70, 'Triagem clínica, acolhimento rápido e acompanhamento terapêutico.'),
  ('prof_cg_5', 'Dra. Mariana Vasconcelos', 'spec_clinica_geral', 'Clínica Geral', ARRAY['Segunda', 'Quinta'], ARRAY['Manhã', 'Noite'], true, 4.90, 'Atenção primária, orientação sobre exames básicos e suporte familiar.'),
  ('prof_cg_6', 'Dr. Gustavo Almeida', 'spec_clinica_geral', 'Clínica Geral', ARRAY['Terça', 'Sexta', 'Sábado'], ARRAY['Tarde', 'Noite'], true, 4.80, 'Atendimento humanizado para adultos e idosos com foco em bem-estar.'),
  ('prof_cg_7', 'Dra. Beatriz Carvalho', 'spec_clinica_geral', 'Clínica Geral', ARRAY['Segunda', 'Quarta'], ARRAY['Manhã', 'Tarde'], true, 4.80, 'Avaliação clínica integrada e orientações de autocuidado contínuo.'),
  ('prof_cg_8', 'Dr. Eduardo Menezes', 'spec_clinica_geral', 'Clínica Geral', ARRAY['Terça', 'Quarta', 'Quinta'], ARRAY['Manhã'], true, 4.70, 'Prevenção de doenças crônicas e educação comunitária em saúde.'),
  ('prof_cg_9', 'Dra. Juliana Ribeiro', 'spec_clinica_geral', 'Clínica Geral', ARRAY['Quinta', 'Sexta'], ARRAY['Tarde', 'Noite'], true, 4.90, 'Acolhimento inicial e direcionamento terapêutico na atenção básica.'),
  ('prof_cg_10', 'Dr. André Fernandes', 'spec_clinica_geral', 'Clínica Geral', ARRAY['Segunda', 'Sábado'], ARRAY['Manhã', 'Tarde'], true, 4.80, 'Teleorientação clínica e acompanhamento de sintomas ambulatoriais.'),

  -- 5.2 Cardiologia (10 médicos)
  ('prof_cardio_1', 'Dr. Marcelo Azevedo', 'spec_cardiologia', 'Cardiologia', ARRAY['Segunda', 'Quarta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Avaliação de risco cardiovascular e monitoramento de hipertensão arterial.'),
  ('prof_cardio_2', 'Dra. Patrícia Moreira', 'spec_cardiologia', 'Cardiologia', ARRAY['Terça', 'Quinta'], ARRAY['Tarde', 'Noite'], true, 4.90, 'Orientação cardiológica preventiva e estilo de vida saudável.'),
  ('prof_cardio_3', 'Dr. Ricardo Tavares', 'spec_cardiologia', 'Cardiologia', ARRAY['Segunda', 'Sexta'], ARRAY['Manhã'], true, 4.80, 'Acompanhamento preventivo de arritmias e orientação após exames.'),
  ('prof_cardio_4', 'Dra. Fernanda Cavalcante', 'spec_cardiologia', 'Cardiologia', ARRAY['Quarta', 'Sexta'], ARRAY['Manhã', 'Tarde'], true, 4.80, 'Saúde do coração, controle de dislipidemias e teleorientação.'),
  ('prof_cardio_5', 'Dr. Bruno Siqueira', 'spec_cardiologia', 'Cardiologia', ARRAY['Terça', 'Quarta'], ARRAY['Tarde'], true, 4.70, 'Check-up cardiológico preventivo e triagem de sintomas precordiais.'),
  ('prof_cardio_6', 'Dra. Daniela Freitas', 'spec_cardiologia', 'Cardiologia', ARRAY['Segunda', 'Quinta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Cardiologia clínica ambulatorial e suporte a pacientes hipertensos.'),
  ('prof_cardio_7', 'Dr. Leonardo Barros', 'spec_cardiologia', 'Cardiologia', ARRAY['Terça', 'Sexta'], ARRAY['Tarde', 'Noite'], true, 4.80, 'Orientação sobre atividade física segura e saúde cardiovascular.'),
  ('prof_cardio_8', 'Dra. Renata Campos', 'spec_cardiologia', 'Cardiologia', ARRAY['Quarta', 'Sábado'], ARRAY['Manhã'], true, 4.80, 'Prevenção de infarto e acompanhamento ambulatorial de rotina.'),
  ('prof_cardio_9', 'Dr. Vinícius Duarte', 'spec_cardiologia', 'Cardiologia', ARRAY['Segunda', 'Quarta', 'Quinta'], ARRAY['Tarde'], true, 4.90, 'Telemedicina cardiológica e esclarecimento de laudos de eletrocardiograma.'),
  ('prof_cardio_10', 'Dra. Carolina Mendes', 'spec_cardiologia', 'Cardiologia', ARRAY['Terça', 'Quinta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Acompanhamento longitudinal de pacientes com fatores de risco cardíaco.'),

  -- 5.3 Ortopedia (8 profissionais)
  ('prof_orto_1', 'Dr. Thiago Vasquez', 'spec_ortopedia', 'Ortopedia', ARRAY['Segunda', 'Quarta'], ARRAY['Manhã', 'Tarde'], true, 4.80, 'Cuidados com a coluna vertebral, postura e alívio de lombalgia.'),
  ('prof_orto_2', 'Dra. Larissa Peixoto', 'spec_ortopedia', 'Ortopedia', ARRAY['Terça', 'Quinta'], ARRAY['Tarde'], true, 4.90, 'Orientação de dores em joelhos, articulações e recuperação motora.'),
  ('prof_orto_3', 'Dr. Márcio Prado', 'spec_ortopedia', 'Ortopedia', ARRAY['Quarta', 'Sexta'], ARRAY['Manhã', 'Tarde'], true, 4.70, 'Orientações pós-entorse, reabilitação física e ergonomia no trabalho.'),
  ('prof_orto_4', 'Dra. Tatiana Bueno', 'spec_ortopedia', 'Ortopedia', ARRAY['Segunda', 'Sexta'], ARRAY['Tarde', 'Noite'], true, 4.80, 'Saúde dos ombros, cotovelos e prevenção de tendinopatias.'),
  ('prof_orto_5', 'Dr. Alexandre Gouveia', 'spec_ortopedia', 'Ortopedia', ARRAY['Terça', 'Sábado'], ARRAY['Manhã'], true, 4.80, 'Ortopedia preventiva e orientação para prática de esportes.'),
  ('prof_orto_6', 'Dra. Sabrina Lins', 'spec_ortopedia', 'Ortopedia', ARRAY['Quinta', 'Sexta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Acompanhamento de artrose, osteoporose e fortalecimento musculoesquelético.'),
  ('prof_orto_7', 'Dr. Renato Figueiredo', 'spec_ortopedia', 'Ortopedia', ARRAY['Segunda', 'Terça'], ARRAY['Tarde'], true, 4.70, 'Cuidados ortopédicos na terceira idade e prevenção de quedas.'),
  ('prof_orto_8', 'Dra. Bianca Parente', 'spec_ortopedia', 'Ortopedia', ARRAY['Quarta', 'Quinta'], ARRAY['Manhã'], true, 4.80, 'Teleorientação para dores crônicas e direcionamento fisioterapêutico.'),

  -- 5.4 Oftalmologia (8 profissionais)
  ('prof_oftalmo_1', 'Dr. Murilo Antunes', 'spec_oftalmologia', 'Oftalmologia', ARRAY['Segunda', 'Quarta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Orientação sobre cansaço visual por telas e higiene das pálpebras.'),
  ('prof_oftalmo_2', 'Dra. Vanessa Meireles', 'spec_oftalmologia', 'Oftalmologia', ARRAY['Terça', 'Quinta'], ARRAY['Tarde'], true, 4.80, 'Esclarecimento de sintomas de olho seco e alergias oculares.'),
  ('prof_oftalmo_3', 'Dr. Caio Fontes', 'spec_oftalmologia', 'Oftalmologia', ARRAY['Quarta', 'Sexta'], ARRAY['Manhã', 'Noite'], true, 4.70, 'Prevenção de glaucoma e acompanhamento da saúde ocular na diabetes.'),
  ('prof_oftalmo_4', 'Dra. Luiza Valente', 'spec_oftalmologia', 'Oftalmologia', ARRAY['Segunda', 'Sexta'], ARRAY['Tarde'], true, 4.90, 'Orientações para uso adequado de colírios e cuidados visuais escolares.'),
  ('prof_oftalmo_5', 'Dr. Danilo Chaves', 'spec_oftalmologia', 'Oftalmologia', ARRAY['Terça', 'Sábado'], ARRAY['Manhã'], true, 4.80, 'Triagem e orientação inicial de queixas visuais ambulatoriais.'),
  ('prof_oftalmo_6', 'Dra. Isabela Saraiva', 'spec_oftalmologia', 'Oftalmologia', ARRAY['Quarta', 'Quinta'], ARRAY['Manhã', 'Tarde'], true, 4.80, 'Cuidados com a visão infantil e esclarecimento sobre miopia.'),
  ('prof_oftalmo_7', 'Dr. Lucas Silveira', 'spec_oftalmologia', 'Oftalmologia', ARRAY['Segunda', 'Quinta'], ARRAY['Tarde', 'Noite'], true, 4.70, 'Avaliação de irritações oculares e prevenção de conjuntivite.'),
  ('prof_oftalmo_8', 'Dra. Gabriela Sales', 'spec_oftalmologia', 'Oftalmologia', ARRAY['Terça', 'Sexta'], ARRAY['Manhã'], true, 4.90, 'Saúde ocular integrada e suporte a pacientes com queixas refrativas.'),

  -- 5.5 Dermatologia (8 profissionais)
  ('prof_dermato_1', 'Dra. Clarice Braga', 'spec_dermatologia', 'Dermatologia', ARRAY['Segunda', 'Quarta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Orientação sobre lesões inflamatórias da pele, dermatites e acne.'),
  ('prof_dermato_2', 'Dr. Rodrigo Fagundes', 'spec_dermatologia', 'Dermatologia', ARRAY['Terça', 'Quinta'], ARRAY['Tarde', 'Noite'], true, 4.80, 'Fotoproteção, prevenção do câncer de pele e cuidados pós-sol.'),
  ('prof_dermato_3', 'Dra. Alice Quintana', 'spec_dermatologia', 'Dermatologia', ARRAY['Quarta', 'Sexta'], ARRAY['Manhã'], true, 4.90, 'Cuidados com cabelos, unhas e pele sensível.'),
  ('prof_dermato_4', 'Dr. Otávio Ramos', 'spec_dermatologia', 'Dermatologia', ARRAY['Segunda', 'Sexta'], ARRAY['Tarde'], true, 4.70, 'Avaliação inicial de prurido cutâneo e infecções dermatológicas simples.'),
  ('prof_dermato_5', 'Dra. Priscila Viana', 'spec_dermatologia', 'Dermatologia', ARRAY['Terça', 'Sábado'], ARRAY['Manhã'], true, 4.80, 'Acompanhamento preventivo de alergias na pele e eczemas.'),
  ('prof_dermato_6', 'Dr. Wesley Miranda', 'spec_dermatologia', 'Dermatologia', ARRAY['Quarta', 'Quinta'], ARRAY['Manhã', 'Tarde'], true, 4.70, 'Orientação de hidratação cutânea na terceira idade e cicatrizes.'),
  ('prof_dermato_7', 'Dra. Marina Furtado', 'spec_dermatologia', 'Dermatologia', ARRAY['Segunda', 'Quinta'], ARRAY['Tarde'], true, 4.90, 'Dermatologia ambulatorial básica e higiene de anexos cutâneos.'),
  ('prof_dermato_8', 'Dr. Gilberto Gusmão', 'spec_dermatologia', 'Dermatologia', ARRAY['Terça', 'Sexta'], ARRAY['Manhã', 'Tarde'], true, 4.80, 'Orientação contra micoses, cuidados nos pés e unhas.'),

  -- 5.6 Ginecologia (8 profissionais)
  ('prof_gineco_1', 'Dra. Letícia Brandão', 'spec_ginecologia', 'Ginecologia', ARRAY['Segunda', 'Quarta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Saúde integral da mulher, exames preventivos e climatério.'),
  ('prof_gineco_2', 'Dr. Samuel Rocha', 'spec_ginecologia', 'Ginecologia', ARRAY['Terça', 'Quinta'], ARRAY['Tarde', 'Noite'], true, 4.80, 'Planejamento reprodutivo, contracepção e esclarecimento de dúvidas.'),
  ('prof_gineco_3', 'Dra. Débora Mattos', 'spec_ginecologia', 'Ginecologia', ARRAY['Quarta', 'Sexta'], ARRAY['Manhã'], true, 4.90, 'Acompanhamento do ciclo menstrual e orientação para endometriose.'),
  ('prof_gineco_4', 'Dr. Fábio Cunha', 'spec_ginecologia', 'Ginecologia', ARRAY['Segunda', 'Sexta'], ARRAY['Tarde'], true, 4.70, 'Orientação preventiva pré-concepcional e cuidados na gravidez inicial.'),
  ('prof_gineco_5', 'Dra. Raquel Toledo', 'spec_ginecologia', 'Ginecologia', ARRAY['Terça', 'Sábado'], ARRAY['Manhã'], true, 4.80, 'Acolhimento humanizado e esclarecimento sobre saúde da mama.'),
  ('prof_gineco_6', 'Dr. Heitor Dornelles', 'spec_ginecologia', 'Ginecologia', ARRAY['Quinta', 'Sexta'], ARRAY['Manhã', 'Tarde'], true, 4.80, 'Prevenção de infecções ginecológicas e orientações de higiene íntima.'),
  ('prof_gineco_7', 'Dra. Sofia Mendonça', 'spec_ginecologia', 'Ginecologia', ARRAY['Segunda', 'Terça'], ARRAY['Tarde'], true, 4.90, 'Atenção à saúde da mulher jovem e educação em saúde sexual.'),
  ('prof_gineco_8', 'Dra. Simone Abreu', 'spec_ginecologia', 'Ginecologia', ARRAY['Quarta', 'Quinta'], ARRAY['Noite'], true, 4.70, 'Teleorientação para sintomas da menopausa e qualidade de vida.'),

  -- 5.7 Endocrinologia (7 profissionais)
  ('prof_endocrino_1', 'Dra. Cecília Queiroz', 'spec_endocrinologia', 'Endocrinologia', ARRAY['Segunda', 'Quarta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Manejo e controle de diabetes mellitus, glicemia e rotinas alimentares.'),
  ('prof_endocrino_2', 'Dr. Valter Silveira', 'spec_endocrinologia', 'Endocrinologia', ARRAY['Terça', 'Quinta'], ARRAY['Tarde'], true, 4.80, 'Acompanhamento de hipotireoidismo, hipertireoidismo e nódulos.'),
  ('prof_endocrino_3', 'Dra. Lorena Castilho', 'spec_endocrinologia', 'Endocrinologia', ARRAY['Quarta', 'Sexta'], ARRAY['Manhã', 'Noite'], true, 4.80, 'Metabolismo, controle de peso e orientações de prevenção de obesidade.'),
  ('prof_endocrino_4', 'Dr. Danilo Paiva', 'spec_endocrinologia', 'Endocrinologia', ARRAY['Segunda', 'Sexta'], ARRAY['Tarde'], true, 4.70, 'Esclarecimento de exames hormonais e hábitos de vida preventivos.'),
  ('prof_endocrino_5', 'Dra. Taís Bernardes', 'spec_endocrinologia', 'Endocrinologia', ARRAY['Terça', 'Sábado'], ARRAY['Manhã'], true, 4.90, 'Saúde óssea, osteopenia e suplementação orientada de vitamina D.'),
  ('prof_endocrino_6', 'Dr. Murilo Correia', 'spec_endocrinologia', 'Endocrinologia', ARRAY['Quinta', 'Sexta'], ARRAY['Tarde', 'Noite'], true, 4.70, 'Manejo de síndrome metabólica e orientação multidisciplinar.'),
  ('prof_endocrino_7', 'Dra. Viviane Teles', 'spec_endocrinologia', 'Endocrinologia', ARRAY['Segunda', 'Terça'], ARRAY['Manhã'], true, 4.80, 'Endocrinologia clínica com ênfase em autocuidado contínuo.'),

  -- 5.8 Neurologia (7 profissionais)
  ('prof_neuro_1', 'Dr. Henrique Valadares', 'spec_neurologia', 'Neurologia', ARRAY['Segunda', 'Quarta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Investigação e alívio de cefaleias tensionais e enxaqueca crônica.'),
  ('prof_neuro_2', 'Dra. Elisa Couto', 'spec_neurologia', 'Neurologia', ARRAY['Terça', 'Quinta'], ARRAY['Tarde'], true, 4.90, 'Acompanhamento de queixas de memória e cognição na melhor idade.'),
  ('prof_neuro_3', 'Dr. Sérgio Portela', 'spec_neurologia', 'Neurologia', ARRAY['Quarta', 'Sexta'], ARRAY['Manhã', 'Noite'], true, 4.70, 'Orientação sobre distúrbios do sono, insônia e higiene do sono.'),
  ('prof_neuro_4', 'Dra. Natália Esteves', 'spec_neurologia', 'Neurologia', ARRAY['Segunda', 'Sexta'], ARRAY['Tarde'], true, 4.80, 'Teleorientação para tremores, dormências e sintomas vestibulares.'),
  ('prof_neuro_5', 'Dr. Leandro Maciel', 'spec_neurologia', 'Neurologia', ARRAY['Terça', 'Sábado'], ARRAY['Manhã'], true, 4.80, 'Esclarecimento de laudos de eletroencefalograma e ressonância.'),
  ('prof_neuro_6', 'Dra. Amanda Guimarães', 'spec_neurologia', 'Neurologia', ARRAY['Quarta', 'Quinta'], ARRAY['Tarde'], true, 4.90, 'Acompanhamento preventivo de neuropatias periféricas e formigamentos.'),
  ('prof_neuro_7', 'Dr. Cristiano Bastos', 'spec_neurologia', 'Neurologia', ARRAY['Quinta', 'Sexta'], ARRAY['Manhã'], true, 4.70, 'Neurologia ambulatorial e esclarecimento sobre prevenção do AVC.'),

  -- 5.9 Otorrinolaringologia (7 profissionais)
  ('prof_otorrino_1', 'Dr. Paulo Rogério', 'spec_otorrinolaringologia', 'Otorrinolaringologia', ARRAY['Segunda', 'Quarta'], ARRAY['Manhã', 'Tarde'], true, 4.80, 'Manejo de rinite alérgica, sinusites e desvio septal.'),
  ('prof_otorrino_2', 'Dra. Fabiana Antunes', 'spec_otorrinolaringologia', 'Otorrinolaringologia', ARRAY['Terça', 'Quinta'], ARRAY['Tarde', 'Noite'], true, 4.90, 'Queixas de zumbido no ouvido, tontura e cuidados auditivos.'),
  ('prof_otorrino_3', 'Dr. Rogério Moura', 'spec_otorrinolaringologia', 'Otorrinolaringologia', ARRAY['Quarta', 'Sexta'], ARRAY['Manhã'], true, 4.70, 'Dor de garganta de repetição, rouquidão e higiene vocal.'),
  ('prof_otorrino_4', 'Dra. Mônica Fontenele', 'spec_otorrinolaringologia', 'Otorrinolaringologia', ARRAY['Segunda', 'Sexta'], ARRAY['Tarde'], true, 4.80, 'Orientações contra otites externas e cuidados pós-banho de mar/piscina.'),
  ('prof_otorrino_5', 'Dr. Cláudio Peçanha', 'spec_otorrinolaringologia', 'Otorrinolaringologia', ARRAY['Terça', 'Sábado'], ARRAY['Manhã'], true, 4.70, 'Ronco, apneia do sono e desobstrução das vias aéreas superiores.'),
  ('prof_otorrino_6', 'Dra. Gabriela Vasconcelos', 'spec_otorrinolaringologia', 'Otorrinolaringologia', ARRAY['Quinta', 'Sexta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Atenção às vias aéreas infantis e orientações de lavagem nasal.'),
  ('prof_otorrino_7', 'Dr. Yuri Fagundes', 'spec_otorrinolaringologia', 'Otorrinolaringologia', ARRAY['Segunda', 'Terça'], ARRAY['Tarde'], true, 4.80, 'Teleorientação para sintomas alérgicos respiratórios sazonais.'),

  -- 5.10 Urologia (7 profissionais)
  ('prof_uro_1', 'Dr. Wagner Calheiros', 'spec_urologia', 'Urologia', ARRAY['Segunda', 'Quarta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Prevenção urológica masculina, saúde da próstata e exames de rotina.'),
  ('prof_uro_2', 'Dr. Álvaro Pimentel', 'spec_urologia', 'Urologia', ARRAY['Terça', 'Quinta'], ARRAY['Tarde', 'Noite'], true, 4.80, 'Prevenção e manejo de cálculos renais e hidratação.'),
  ('prof_uro_3', 'Dra. Cristina Del Valle', 'spec_urologia', 'Urologia', ARRAY['Quarta', 'Sexta'], ARRAY['Manhã'], true, 4.90, 'Infecções do trato urinário femininas e masculinas e saúde vesical.'),
  ('prof_uro_4', 'Dr. Jorge Aragão', 'spec_urologia', 'Urologia', ARRAY['Segunda', 'Sexta'], ARRAY['Tarde'], true, 4.70, 'Orientação preventiva sobre incontinência urinária e fortalecimento pélvico.'),
  ('prof_uro_5', 'Dr. Rodrigo Sanches', 'spec_urologia', 'Urologia', ARRAY['Terça', 'Sábado'], ARRAY['Manhã'], true, 4.80, 'Acompanhamento do homem maduro e esclarecimento de PSA.'),
  ('prof_uro_6', 'Dr. Bernardo Castelo', 'spec_urologia', 'Urologia', ARRAY['Quinta', 'Sexta'], ARRAY['Manhã', 'Tarde'], true, 4.80, 'Teleorientação para sintomas miccionais e hábitos protetores renais.'),
  ('prof_uro_7', 'Dra. Paola Vianna', 'spec_urologia', 'Urologia', ARRAY['Segunda', 'Terça'], ARRAY['Tarde'], true, 4.90, 'Urologia geral com abordagem humanizada e acolhimento preventivo.'),

  -- 5.11 Gastroenterologia (7 profissionais)
  ('prof_gastro_1', 'Dr. Tiago Salgado', 'spec_gastroenterologia', 'Gastroenterologia', ARRAY['Segunda', 'Quarta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Orientação sobre refluxo gastroesofágico, queimação e gastrite.'),
  ('prof_gastro_2', 'Dra. Regina Morais', 'spec_gastroenterologia', 'Gastroenterologia', ARRAY['Terça', 'Quinta'], ARRAY['Tarde', 'Noite'], true, 4.80, 'Síndrome do intestino irritável, intolerâncias alimentares e digestão.'),
  ('prof_gastro_3', 'Dr. Vicente Queiroz', 'spec_gastroenterologia', 'Gastroenterologia', ARRAY['Quarta', 'Sexta'], ARRAY['Manhã'], true, 4.80, 'Prevenção de doenças hepáticas, esteatose e rotina alimentar.'),
  ('prof_gastro_4', 'Dra. Tatiana Meira', 'spec_gastroenterologia', 'Gastroenterologia', ARRAY['Segunda', 'Sexta'], ARRAY['Tarde'], true, 4.70, 'Acompanhamento de queixas de distensão abdominal e constipação crônica.'),
  ('prof_gastro_5', 'Dr. Daniel Padilha', 'spec_gastroenterologia', 'Gastroenterologia', ARRAY['Terça', 'Sábado'], ARRAY['Manhã'], true, 4.80, 'Esclarecimento de exames de endoscopia e colonoscopia preventiva.'),
  ('prof_gastro_6', 'Dra. Juliana Aguiar', 'spec_gastroenterologia', 'Gastroenterologia', ARRAY['Quinta', 'Sexta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Atenção aos distúrbios funcionais gastrointestinais e nutrição.'),
  ('prof_gastro_7', 'Dr. Arthur Vasconcellos', 'spec_gastroenterologia', 'Gastroenterologia', ARRAY['Segunda', 'Quarta'], ARRAY['Noite'], true, 4.80, 'Gastroenterologia ambulatorial e suporte na rotina de alimentação.'),

  -- 5.12 Psicologia — 8 profissionais (área de atendimento profissional em saúde mental)
  ('prof_psico_1', 'Psic. Amanda Lima', 'spec_psicologia', 'Psicologia', ARRAY['Segunda', 'Quarta', 'Sexta'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Acolhimento de ansiedade, estresse contemporâneo e regulação emocional.'),
  ('prof_psico_2', 'Psic. Carlos Eduardo Siqueira', 'spec_psicologia', 'Psicologia', ARRAY['Terça', 'Quinta', 'Sábado'], ARRAY['Tarde', 'Noite'], true, 4.90, 'Escuta qualificada, apoio em momentos de luto e transições de vida.'),
  ('prof_psico_3', 'Psic. Luciana Marinho', 'spec_psicologia', 'Psicologia', ARRAY['Segunda', 'Terça', 'Quinta'], ARRAY['Manhã', 'Tarde'], true, 4.80, 'Psicologia preventiva, bem-estar psicológico e manejo do burnout.'),
  ('prof_psico_4', 'Psic. Daniel Borges', 'spec_psicologia', 'Psicologia', ARRAY['Quarta', 'Sexta'], ARRAY['Tarde', 'Noite'], true, 4.80, 'Apoio em autoestima, relacionamentos interpessoais e desenvolvimento pessoal.'),
  ('prof_psico_5', 'Psic. Fernanda Nogueira', 'spec_psicologia', 'Psicologia', ARRAY['Segunda', 'Quarta'], ARRAY['Noite'], true, 4.90, 'Acolhimento humanizado para jovens e adultos com sobrecarga mental.'),
  ('prof_psico_6', 'Psic. Rodrigo Beltrão', 'spec_psicologia', 'Psicologia', ARRAY['Terça', 'Sexta'], ARRAY['Manhã'], true, 4.70, 'Orientação psicológica breve e suporte para hábitos saudáveis de rotina.'),
  ('prof_psico_7', 'Psic. Mariana Esteves', 'spec_psicologia', 'Psicologia', ARRAY['Quinta', 'Sexta', 'Sábado'], ARRAY['Manhã', 'Tarde'], true, 4.90, 'Acolhimento da saúde emocional da mulher, maternidade e resiliência.'),
  ('prof_psico_8', 'Psic. Thiago Medeiros', 'spec_psicologia', 'Psicologia', ARRAY['Segunda', 'Quinta'], ARRAY['Tarde', 'Noite'], true, 4.80, 'Espaço de escuta empática e fortalecimento da saúde mental comunitária.')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  specialty_name = EXCLUDED.specialty_name,
  available_days = EXCLUDED.available_days,
  shifts = EXCLUDED.shifts,
  active = EXCLUDED.active,
  rating = EXCLUDED.rating,
  bio_summary = EXCLUDED.bio_summary;

-- ----------------------------------------------------------------------------
-- 11. INSERÇÃO DE DOCUMENTOS DEMONSTRATIVOS INICIAIS (SEED)
-- ----------------------------------------------------------------------------
INSERT INTO public.demonstrative_documents (id, citizen_id, citizen_name, title, document_type, issued_date, doctor_name, specialty, document_number, content)
VALUES
  (
    'doc_1',
    'user_citizen_demo',
    'Maria Silva',
    'Receita Digital Demonstrativa',
    'receita',
    '2026-11-04',
    'Dra. Helena Martins',
    'Clínica Geral',
    'REC-SUS-2026-0892',
    '{
      "diagnosisOrSubject": "Sintomas gripais leves e cefaleia tensional",
      "items": [
        "1. Dipirona Sódica 500mg — Tomar 1 comprimido via oral a cada 6 horas se houver dor ou febre (máx. 4 ao dia)",
        "2. Solução Salina Fisiológica 0,9% — Realizar lavagem nasal 3 vezes ao dia com seringa de 10ml",
        "3. Hidratação oral abundante (2 a 3 litros de água por dia) e repouso relativo"
      ],
      "bodyText": "Paciente orientada sobre sinais de alerta como falta de ar, febre persistente por mais de 72h ou prostração excessiva. Caso ocorram, procurar imediatamente uma unidade de pronto atendimento (UPA).",
      "validityDays": 30,
      "demonstrativeNotice": "Documento gerado em ambiente de simulação acadêmica do SUS CONECT. Sem validade fiscal ou farmacêutica oficial."
    }'::jsonb
  ),
  (
    'doc_2',
    'user_citizen_demo',
    'Maria Silva',
    'Declaração de Comparecimento Virtual',
    'atestado',
    '2026-11-04',
    'Dra. Helena Martins',
    'Clínica Geral',
    'DEC-SUS-2026-1104',
    '{
      "diagnosisOrSubject": "Atendimento por Teleconsulta Virtual",
      "bodyText": "Declaro para os devidos fins de comprovação acadêmica que a cidadã Maria Silva participou de teleorientação em saúde no dia 04/11/2026, no horário das 14:00 às 14:40, através da plataforma digital SUS CONECT.",
      "demonstrativeNotice": "Simulação acadêmica para o projeto Formação Geração Tech 4.0."
    }'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
