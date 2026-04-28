import type { FormQuestion } from "./formSeedData";

// Questionário Executivo — IA para Transcrição e Análise de Chamadas (versão enxuta, múltipla escolha)
export const DISCOVERY_EXECUTIVO_FORM_CONFIG: FormQuestion[] = [
  // 1. Objetivo e Escopo
  { id: "exec_q1", section: "1. Objetivo e Escopo", label: "Qual é o principal objetivo da solução?", type: "radio", required: true, options: [
    "Apenas transcrever chamadas",
    "Transcrever e gerar resumos",
    "Avaliar desempenho comercial dos vendedores",
    "Transcrever, resumir e avaliar desempenho",
    "Ainda não definido",
  ]},
  { id: "exec_q2", section: "1. Objetivo e Escopo", label: "Quais áreas utilizarão a solução inicialmente?", type: "checkbox", required: true, options: [
    "Vendas", "Atendimento", "Suporte", "Cobrança", "Pós-venda", "Mais de uma área", "Outro",
  ]},
  { id: "exec_q3", section: "1. Objetivo e Escopo", label: "Quantos usuários/vendedores/atendentes participarão da primeira fase?", type: "radio", required: true, options: [
    "1 a 5", "6 a 10", "11 a 25", "26 a 50", "Mais de 50", "Ainda não sabemos",
  ]},

  // 2. Ambiente Yeastar / Telefonia
  { id: "exec_q4", section: "2. Ambiente Yeastar / Telefonia", label: "Qual é o ambiente Yeastar utilizado?", type: "radio", required: true, options: [
    "Yeastar P-Series Cloud Edition",
    "Yeastar P-Series Software Edition",
    "Yeastar P-Series Appliance Edition",
    "Outro modelo Yeastar",
    "Não sabemos informar",
  ]},
  { id: "exec_q5", section: "2. Ambiente Yeastar / Telefonia", label: "Vocês sabem a versão atual do sistema/firmware Yeastar?", type: "radio", required: false, options: [
    "Sim", "Não", "TI/fornecedor irá confirmar",
  ]},
  { id: "exec_q6", section: "2. Ambiente Yeastar / Telefonia", label: "As chamadas já são gravadas atualmente?", type: "radio", required: true, options: [
    "Sim, todas", "Sim, apenas algumas", "Não", "Não sabemos",
  ]},
  { id: "exec_q7", section: "2. Ambiente Yeastar / Telefonia", label: "Onde as gravações ficam armazenadas hoje?", type: "radio", required: false, options: [
    "No próprio Yeastar",
    "Em servidor/local interno",
    "Em nuvem",
    "Em outro sistema",
    "Não sabemos",
    "Não se aplica, pois ainda não gravamos",
  ]},
  { id: "exec_q8", section: "2. Ambiente Yeastar / Telefonia", label: "Existe alguma forma automática de acessar as gravações?", type: "checkbox", required: false, options: [
    "API", "SFTP/FTP", "Exportação programada", "Webhook/integração", "Apenas manual pelo painel", "Não sabemos",
  ]},
  { id: "exec_q9", section: "2. Ambiente Yeastar / Telefonia", label: "O PABX gera relatório de chamadas com ramal, data, hora, duração e número chamado?", type: "radio", required: false, options: [
    "Sim", "Parcialmente", "Não", "Não sabemos",
  ]},
  { id: "exec_q10", section: "2. Ambiente Yeastar / Telefonia", label: "Qual é o volume mensal aproximado de chamadas ou horas de áudio?", type: "radio", required: true, options: [
    "Até 500 chamadas/mês",
    "501 a 2.000 chamadas/mês",
    "2.001 a 5.000 chamadas/mês",
    "Mais de 5.000 chamadas/mês",
    "Sabemos em horas (informar nas observações)",
    "Não sabemos",
  ]},
  { id: "exec_q11", section: "2. Ambiente Yeastar / Telefonia", label: "As chamadas são, em sua maioria:", type: "radio", required: false, options: [
    "Ativas", "Receptivas", "Ambas", "Não sabemos",
  ]},
  { id: "exec_q12", section: "2. Ambiente Yeastar / Telefonia", label: "Como é a qualidade média dos áudios gravados?", type: "radio", required: false, options: [
    "Boa, com os dois lados claros",
    "Razoável, mas com alguns ruídos",
    "Ruim, com dificuldade de entender",
    "Ainda não avaliamos",
  ]},

  // 3. Ambiente Microsoft e CRM
  { id: "exec_q13", section: "3. Ambiente Microsoft e CRM", label: "O cliente utiliza Microsoft Teams para telefonia?", type: "radio", required: false, options: [
    "Sim, usamos Teams Phone",
    "Usamos Teams apenas para reuniões/comunicação interna",
    "Não usamos Teams",
    "Não sabemos",
  ]},
  { id: "exec_q14", section: "3. Ambiente Microsoft e CRM", label: "Quais soluções Microsoft o cliente possui atualmente?", type: "checkbox", required: false, options: [
    "Microsoft 365 Copilot", "Teams Phone", "Power BI", "Azure", "Power Automate", "SharePoint/OneDrive", "Não sabemos", "Outro",
  ]},
  { id: "exec_q15", section: "3. Ambiente Microsoft e CRM", label: "O cliente utiliza CRM?", type: "radio", required: false, options: [
    "Dynamics 365", "HubSpot", "Salesforce", "Pipedrive", "RD Station", "Outro", "Não utiliza CRM", "Não sabemos",
  ]},
  { id: "exec_q16", section: "3. Ambiente Microsoft e CRM", label: "A solução precisa registrar informações automaticamente no CRM?", type: "checkbox", required: false, options: [
    "Sim, resumo da chamada",
    "Sim, próximos passos/tarefas",
    "Sim, nota ou classificação da chamada",
    "Não neste primeiro momento",
    "Ainda não definido",
  ]},

  // 4. Análise Comercial, Indicadores e LGPD
  { id: "exec_q17", section: "4. Análise Comercial, Indicadores e LGPD", label: "Quais critérios comerciais devem ser avaliados pela IA?", type: "checkbox", required: false, options: [
    "Abordagem inicial",
    "Aderência ao script",
    "Descoberta de necessidade",
    "Tratamento de objeções",
    "Apresentação da solução",
    "Fechamento/próximos passos",
    "Sentimento/tom da conversa",
    "Ainda não definido",
    "Outro",
  ]},
  { id: "exec_q18", section: "4. Análise Comercial, Indicadores e LGPD", label: "O cliente deseja uma nota por chamada/vendedor?", type: "radio", required: false, options: [
    "Sim, escala de 0 a 5",
    "Sim, escala de 0 a 10",
    "Sim, escala de 0 a 100",
    "Não",
    "Ainda não definido",
  ]},
  { id: "exec_q19", section: "4. Análise Comercial, Indicadores e LGPD", label: "Quais indicadores devem aparecer no dashboard?", type: "checkbox", required: false, options: [
    "Ranking por vendedor",
    "Quantidade de chamadas analisadas",
    "Nota média por vendedor/equipe",
    "Principais objeções",
    "Aderência ao script",
    "Evolução por período",
    "Sentimento das chamadas",
    "Ainda não definido",
    "Outro",
  ]},
  { id: "exec_q20", section: "4. Análise Comercial, Indicadores e LGPD", label: "Existem requisitos de LGPD, segurança ou restrição de uso de IA externa?", type: "checkbox", required: false, options: [
    "Sim, dados devem ficar em ambiente Microsoft/Azure",
    "Sim, não podemos enviar dados para ferramentas externas",
    "Sim, precisamos mascarar dados sensíveis",
    "Sim, há política de retenção de gravações",
    "Não há restrições conhecidas",
    "Ainda será avaliado pelo jurídico/DPO",
  ]},

  // 5. Próximo passo (PoC)
  { id: "exec_q21", section: "5. Próximo passo (PoC)", label: "O cliente aceita iniciar com uma PoC usando uma amostra de chamadas reais?", type: "radio", required: true, options: [
    "Sim, com até 5 usuários",
    "Sim, com 6 a 10 usuários",
    "Sim, com mais de 10 usuários",
    "Preferimos primeiro uma apresentação técnica/comercial",
    "Ainda não definido",
  ]},
];
