import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { db } from './server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header as required
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }
    const user = db.createUser({ name, email, phone: phone || '', password });
    return res.status(201).json({ user, message: 'Cadastro realizado com sucesso!' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao realizar cadastro.' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }
    const user = db.findUserByEmail(email);
    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    const { passwordHash: _, ...safeUser } = user;
    return res.json({ user: safeUser, token: 'demo-jwt-token-' + user.id });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro interno ao autenticar.' });
  }
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'E-mail e nova senha são obrigatórios.' });
    }
    db.resetPassword(email, newPassword);
    return res.json({ message: 'Senha atualizada com sucesso. Você já pode fazer login.' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao redefinir senha.' });
  }
});

// --- SPECIALTIES & PROFESSIONALS ROUTES ---

app.get('/api/specialties', (_req: Request, res: Response) => {
  const specialties = db.getSpecialties();
  return res.json(specialties);
});

app.get('/api/professionals', (req: Request, res: Response) => {
  const specialtyId = req.query.specialtyId as string | undefined;
  const professionals = db.getProfessionals(specialtyId);
  return res.json(professionals);
});

app.put('/api/professionals/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = db.updateProfessional(id, updates);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao atualizar profissional.' });
  }
});

app.post('/api/professionals', (req: Request, res: Response) => {
  try {
    const { name, specialtyId, availableDays, shifts, bioSummary } = req.body;
    if (!name || !specialtyId) {
      return res.status(400).json({ error: 'Nome e área de atendimento são obrigatórios.' });
    }
    const specialty = db.getSpecialtyById(specialtyId);
    if (!specialty) {
      return res.status(400).json({ error: 'Especialidade inválida.' });
    }
    const created = db.createProfessional({
      name,
      specialtyId,
      specialtyName: specialty.name,
      availableDays: availableDays || ['Segunda', 'Quarta', 'Sexta'],
      shifts: shifts || ['Manhã', 'Tarde'],
      active: true,
      rating: 5.0,
      bioSummary: bioSummary || 'Atendimento acolhedor e escuta qualificada.',
    });
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao cadastrar profissional.' });
  }
});

// --- APPOINTMENTS ROUTES ---

app.get('/api/appointments', (req: Request, res: Response) => {
  const citizenId = req.query.citizenId as string | undefined;
  const role = req.query.role as string | undefined;

  if (role === 'admin') {
    return res.json(db.getAllAppointments());
  }

  if (citizenId) {
    return res.json(db.getAppointmentsByCitizen(citizenId));
  }

  return res.json(db.getAllAppointments());
});

app.post('/api/appointments', (req: Request, res: Response) => {
  try {
    const { citizenId, professionalId, specialtyId, date, time, reason } = req.body;
    if (!citizenId || !professionalId || !specialtyId || !date || !time) {
      return res.status(400).json({ error: 'Campos obrigatórios de agendamento não preenchidos.' });
    }
    const appointment = db.createAppointment({
      citizenId,
      professionalId,
      specialtyId,
      date,
      time,
      reason: reason || 'Consulta de rotina e esclarecimento preventivo',
    });
    return res.status(201).json(appointment);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao solicitar agendamento.' });
  }
});

app.put('/api/appointments/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório.' });
    }
    const updated = db.updateAppointmentStatus(id, status, notes);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao atualizar status do agendamento.' });
  }
});

// --- DEMONSTRATIVE DOCUMENTS ROUTES ---

app.get('/api/documents', (req: Request, res: Response) => {
  const citizenId = (req.query.citizenId as string) || 'user_citizen_demo';
  const documents = db.getDocumentsByCitizen(citizenId);
  return res.json(documents);
});

app.post('/api/documents', (req: Request, res: Response) => {
  try {
    const docData = req.body;
    const newDoc = db.createDocument(docData);
    return res.status(201).json(newDoc);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao emitir documento demonstrativo.' });
  }
});

// --- AUTOMATIONS & WEBHOOKS ROUTES ---

app.get('/api/automations/logs', (_req: Request, res: Response) => {
  const logs = db.getWebhookLogs();
  return res.json(logs);
});

app.post('/api/automations/test', async (req: Request, res: Response) => {
  try {
    const { target, customUrl, customToken, chatId, message } = req.body;

    if (target === 'telegram' && customToken && chatId) {
      // Real Telegram notification attempt if user provided their bot token & chat id
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${customToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message || '🔔 Notificação de teste do SUS CONECT (Formação Geração Tech 4.0)',
          }),
        });
        const tgData = await tgRes.json();
        db.addWebhookLog({
          target: 'telegram',
          event: 'TESTE_MANUAL_TELEGRAM',
          payload: { chatId, status: tgData.ok },
          status: tgData.ok ? 'sent' : 'error',
          message: tgData.ok
            ? 'Mensagem enviada com sucesso ao Telegram!'
            : `Telegram API retornou: ${tgData.description || 'Erro desconhecido'}`,
        });
        return res.json({ ok: tgData.ok, data: tgData });
      } catch (tgErr: any) {
        db.addWebhookLog({
          target: 'telegram',
          event: 'FALHA_CONEXAO_TELEGRAM',
          payload: { error: tgErr.message },
          status: 'error',
          message: `Falha na requisição ao Telegram: ${tgErr.message}`,
        });
      }
    } else if (target === 'n8n' && customUrl) {
      // Real n8n webhook call if URL provided
      try {
        const n8nRes = await fetch(customUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'SUS_CONECT_TEST',
            timestamp: new Date().toISOString(),
            message: message || 'Teste de automação com webhook n8n',
          }),
        });
        db.addWebhookLog({
          target: 'n8n',
          event: 'WEBHOOK_N8N_DISPARADO',
          payload: { url: customUrl, status: n8nRes.status },
          status: n8nRes.ok ? 'sent' : 'error',
          message: `Webhook n8n disparado com código HTTP ${n8nRes.status}.`,
        });
        return res.json({ ok: n8nRes.ok, status: n8nRes.status });
      } catch (n8nErr: any) {
        db.addWebhookLog({
          target: 'n8n',
          event: 'FALHA_N8N',
          payload: { error: n8nErr.message },
          status: 'error',
          message: `Falha ao acionar webhook n8n: ${n8nErr.message}`,
        });
      }
    }

    // Default simulation fallback
    const simulatedLog = db.addWebhookLog({
      target: target || 'telegram',
      event: target === 'n8n' ? 'SIMULACAO_ORQUESTRACAO_N8N' : 'SIMULACAO_ALERTA_TELEGRAM',
      payload: {
        plataforma: 'SUS CONECT',
        evento: 'NOTIFICACAO_ADMINISTRATIVA_DEMO',
        detalhes: message || 'Agendamento sincronizado com sucesso.',
      },
      status: 'simulated',
      message:
        target === 'n8n'
          ? 'Automação n8n simulada: workflow ativado para processamento assíncrono.'
          : 'Notificação Telegram simulada: mensagem registrada no canal administrativo da coordenação.',
    });

    return res.json({ ok: true, simulated: true, log: simulatedLog });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao processar automação.' });
  }
});

// --- GEMINI AI ASSISTANT SUS ANA ROUTE ---

const ANA_SYSTEM_INSTRUCTION = `Você é a SUS ANA, a assistente virtual acolhedora, empática e prestativa do SUS CONECT.
Contexto do projeto: O SUS CONECT é um projeto acadêmico independente da Formação Geração Tech 4.0, concebido para aproximar os cidadãos de orientações de saúde e agendamento de teleconsultas.

Suas diretrizes fundamentais:
1. Tom de voz: Extremamente acolhedor, empático, claro, compreensivo e didático. Use linguagem simples e acessível a qualquer cidadão brasileiro.
2. Orientações disponíveis na plataforma:
   - Apresente e tire dúvidas sobre as 12 áreas de atendimento: Clínica Geral, Cardiologia, Ortopedia, Oftalmologia, Dermatologia, Ginecologia, Endocrinologia, Neurologia, Otorrinolaringologia, Urologia, Gastroenterologia e Psicologia (ressalte que Psicologia é uma área de atendimento profissional para apoio emocional e saúde mental).
   - Explique como agendar uma teleconsulta: o cidadão acessa o Painel, escolhe a especialidade, seleciona um dos 90 profissionais disponíveis, define data/turno e confirma o pedido.
   - Esclareça sobre os documentos demonstrativos disponíveis (receitas digitais, atestados e planos de cuidados).
3. SEGURANÇA E REGRA DE OURO EM SAÚDE:
   - Você NÃO substitui a consulta médica presencial ou virtual nem prescreve medicamentos tarjados por conta própria.
   - Em caso de sintomas graves ou queixas de urgência (dor súbita forte no peito, falta de ar severa, desmaio, confusão mental súbita, perda de força em um lado do corpo, sangramento volumoso), oriente com firmeza e carinho para ACIONAR IMEDIATAMENTE O SAMU (LIGUE 192) OU IR À UPA MAIS PRÓXIMA.
4. Lembrete institucional:
   - Se perguntado se é o SUS oficial do governo, esclareça cordialmente que o SUS CONECT é uma inovadora simulação acadêmica independente da Formação Geração Tech 4.0.
5. Formatação:
   - Seja concisa, divida respostas em tópicos breves quando útil, e sugira o próximo passo (ex: "Gostaria que eu te ajudasse a encontrar um profissional de cardiologia ou clínica geral agora?").`;

app.post('/api/chat/ana', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem do cidadão é obrigatória.' });
    }

    if (ai) {
      try {
        // Build conversational context
        let promptText = `Instrução do Sistema:\n${ANA_SYSTEM_INSTRUCTION}\n\n`;

        if (Array.isArray(history) && history.length > 0) {
          promptText += 'Histórico da conversa recente:\n';
          for (const item of history.slice(-6)) {
            const speaker = item.sender === 'ana' ? 'SUS ANA' : 'Cidadão';
            promptText += `${speaker}: ${item.text}\n`;
          }
          promptText += '\n';
        }

        promptText += `Cidadão: ${message}\nSUS ANA:`;

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: {
            systemInstruction: ANA_SYSTEM_INSTRUCTION,
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
        );

        const geminiResponse: any = await Promise.race([geminiPromise, timeoutPromise]);

        const replyText = geminiResponse.text?.trim();
        if (replyText) {
          return res.json({ reply: replyText });
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call failed or timed out, using intelligent fallback:', geminiError?.message || geminiError);
      }
    }

    // Intelligent empathetic fallback in case of missing key or API limits
    const lower = message.toLowerCase();
    let fallbackReply = 'Olá! Sou a SUS ANA, sua assistente virtual no SUS CONECT. ';

    if (lower.includes('emergência') || lower.includes('dor no peito') || lower.includes('falta de ar') || lower.includes('infarto')) {
      fallbackReply += '⚠️ Atenção: Se você ou alguém próximo estiver sentindo dor súbita no peito, falta de ar intensa ou perda de consciência, ligue imediatamente para o SAMU 192 ou dirija-se à Unidade de Pronto Atendimento (UPA) mais próxima!';
    } else if (lower.includes('agendar') || lower.includes('marcar') || lower.includes('consulta') || lower.includes('teleconsulta')) {
      fallbackReply += 'Para solicitar sua teleconsulta, basta entrar no seu Painel do Cidadão, clicar na aba "Nova Solicitação", escolher a área de atendimento desejada e selecionar um dos nossos profissionais disponíveis. Tudo de forma rápida e 100% gratuita!';
    } else if (lower.includes('psicologia') || lower.includes('ansiedade') || lower.includes('emocional') || lower.includes('tristeza')) {
      fallbackReply += 'Cuidar da saúde mental é fundamental! No SUS CONECT, a Psicologia é uma área de atendimento profissional dedicada à escuta acolhedora, apoio em ansiedade e alívio do estresse. Nossos profissionais estão prontos para te apoiar.';
    } else if (lower.includes('documento') || lower.includes('receita') || lower.includes('atestado')) {
      fallbackReply += 'Você pode consultar e baixar todos os seus documentos demonstrativos (receitas digitais, atestados e guias) diretamente na aba "Documentos" do Painel do Cidadão.';
    } else if (lower.includes('oficial') || lower.includes('governo') || lower.includes('ministério')) {
      fallbackReply += 'O SUS CONECT é um projeto acadêmico independente da Formação Geração Tech 4.0. Nossa missão é demonstrar como a tecnologia e a inteligência artificial podem humanizar e facilitar o acesso à saúde.';
    } else {
      fallbackReply += 'Estou aqui para te orientar sobre nossas 12 áreas de atendimento, como agendar uma teleconsulta com nossos 90 profissionais ou consultar seus documentos de saúde. Como posso te acolher hoje?';
    }

    return res.json({ reply: fallbackReply });
  } catch (error: any) {
    return res.status(500).json({
      reply: 'Olá! Estou com uma oscilação momentânea, mas você pode agendar sua teleconsulta diretamente no Painel do Cidadão ou procurar a UPA mais próxima se for urgente.',
    });
  }
});

// Setup Vite or static serving
async function setupApp() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUS CONECT] Servidor operacional na porta ${PORT}`);
  });
}

setupApp().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
});
