# 🏥 SUS CONECT — Saúde Digital

> *"A tecnologia aproxima. O cuidado conecta."*[cite: 2, 10]

O **SUS CONECT** é um protótipo acadêmico de aplicação web *mobile-first* desenvolvido como Projeto Final do curso de **IA Generativa (Geração Tech 4.0 — IEL / FIEC / ADECE)**[cite: 1, 6]. A solução demonstra como experiências digitais, agentes conversacionais e automações podem aproximar cidadãos de orientações administrativas, solicitações e agendamentos simulados de teleatendimento[cite: 1].

> ⚠️ **Aviso de Escopo:** O SUS CONECT é um protótipo fictício com finalidade exclusivamente acadêmica[cite: 1, 6]. Não é uma plataforma oficial do Sistema Único de Saúde (SUS), não possui integração com o Ministério da Saúde ou bases governamentais e não substitui serviços públicos reais[cite: 1, 6]. Em situações de emergência médica, procure imediatamente uma unidade de urgência ou acione o **SAMU 192**.

---

## 🎯 Objetivo e Funcionalidades

O sistema reúne interface web responsiva, persistência de dados, agente de IA com ferramentas reais e fluxos automatizados de notificação[cite: 1, 2]:

* **Portal do Cidadão:** Landing page institucional, catálogo de serviços, cadastro com autopreenchimento de endereço via **ViaCEP** e painel para acompanhamento de solicitações e agendamentos[cite: 2, 7, 10].
* **Assistente Virtual (SUS ANA):** Agente conversacional integrado à aplicação capaz de tirar dúvidas sobre o funcionamento do sistema, consultar áreas e horários disponíveis em tempo real e registrar solicitações administrativas[cite: 6, 8, 10].
* **Catálogo de Atendimento Simulado:** Estrutura demonstrativa contemplando **12 áreas de atendimento** (como Clínica Geral, Cardiologia, Ortopedia, Psicologia, entre outras) e **90 profissionais fictícios**[cite: 3, 11, 12].
* **Experiência de Teleconsulta:** Sala de espera virtual, painel diário da agenda do profissional, chamada de áudio/vídeo em tempo real via **WebRTC** e cronômetro sincronizado de 10 minutos com alerta visual nos últimos 2 minutos e encerramento automático[cite: 2, 9].
* **Confirmação Automática via WhatsApp:** Workflow independente que dispara uma mensagem administrativa padronizada ao paciente assim que o agendamento é confirmado no sistema.

---

## 🛠️ Arquitetura e Stack Tecnológica

| Componente | Tecnologia / Ferramenta | Papel na Solução |
| :--- | :--- | :--- |
| **Ambiente de Desenvolvimento** | Google AI Studio | Prototipação e desenvolvimento assistido por IA (*Vibe Coding*)[cite: 2] |
| **Frontend** | React, TypeScript, Vite, TanStack Router | Interface responsiva (*mobile-first*) e roteamento da aplicação[cite: 2, 6] |
| **Backend & Banco de Dados** | Supabase | Autenticação, banco relacional (PostgreSQL), persistência e políticas RLS[cite: 2, 12] |
| **Orquestração & Automação** | n8n | Fluxos do agente conversacional, webhooks e automações transacionais[cite: 2, 4, 10] |
| **Modelo de Linguagem (LLM)** | Google Gemini | Processamento de linguagem natural e chamada de ferramentas da SUS ANA[cite: 2, 4, 8] |
| **Mensageria** | Evolution API (WhatsApp) | Envio automatizado de confirmações administrativas de agendamento[cite: 2, 10] |
| **APIs Auxiliares & Mídia** | ViaCEP & WebRTC | Consulta de endereço por CEP e comunicação de áudio/vídeo em tempo real[cite: 2] |

---

## 🔄 Fluxos Principais

### 1. Fluxo Conversacional (Agente SUS ANA)
```text
Cidadão ──▶ Interface Web ──▶ Webhook (n8n) ──▶ Contexto/Memória ──▶ Gemini
                                                       │
                                      ┌────────────────┴────────────────┐
                                      ▼                                 ▼
                             consultar_areas()                 consultar_horarios()
                                      │                                 │
                                      └──────────▶ Supabase ◀───────────┘
                                                       ▲
                                                       │
                                            registrar_solicitacao()
