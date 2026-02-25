// Pre-built form: "Avaliação de Educação Inclusiva" with 51 questions
export interface FormQuestion {
  id: string;
  section: string;
  subsection?: string;
  label: string;
  type: "text" | "number" | "email" | "phone" | "textarea" | "select" | "checkbox" | "radio";
  required: boolean;
  options?: string[];
  conditionalOn?: { questionId: string; value: string };
}

export const EDUCATION_FORM_CONFIG: FormQuestion[] = [
  // SEÇÃO 1: INFORMAÇÕES GERAIS DA INSTITUIÇÃO
  // 1.1 Identificação
  { id: "q1", section: "Informações Gerais da Instituição", subsection: "Identificação", label: "Qual é o nome completo de sua instituição?", type: "text", required: true },
  { id: "q2", section: "Informações Gerais da Instituição", subsection: "Identificação", label: "Há quanto tempo a instituição funciona?", type: "text", required: true },
  { id: "q3", section: "Informações Gerais da Instituição", subsection: "Identificação", label: "Qual é a missão ou propósito principal de sua creche/colégio?", type: "textarea", required: true },
  // 1.2 Estrutura Operacional
  { id: "q4", section: "Informações Gerais da Instituição", subsection: "Estrutura Operacional", label: "Quantas crianças sua creche atende atualmente?", type: "number", required: true },
  { id: "q5", section: "Informações Gerais da Instituição", subsection: "Estrutura Operacional", label: "Quantas crianças seu colégio atende atualmente?", type: "number", required: true },
  { id: "q6", section: "Informações Gerais da Instituição", subsection: "Estrutura Operacional", label: "Qual é a faixa etária atendida na creche? (Ex: 0-3 anos, 3-6 anos)", type: "text", required: true },
  { id: "q7", section: "Informações Gerais da Instituição", subsection: "Estrutura Operacional", label: "Qual é a faixa etária atendida no colégio? (Ex: 1º ao 6º ano)", type: "text", required: true },
  { id: "q8", section: "Informações Gerais da Instituição", subsection: "Estrutura Operacional", label: "Quantos professores/educadores trabalham na creche?", type: "number", required: true },
  { id: "q9", section: "Informações Gerais da Instituição", subsection: "Estrutura Operacional", label: "Quantos professores/educadores trabalham no colégio?", type: "number", required: true },
  { id: "q10", section: "Informações Gerais da Instituição", subsection: "Estrutura Operacional", label: "Qual é o número total de funcionários (administrativo, limpeza)?", type: "number", required: true },
  // 1.3 Infraestrutura Tecnológica
  { id: "q11", section: "Informações Gerais da Instituição", subsection: "Infraestrutura Tecnológica", label: "Sua instituição utiliza algum sistema de gestão escolar?", type: "radio", required: true, options: ["Sim", "Não"] },
  { id: "q12", section: "Informações Gerais da Instituição", subsection: "Infraestrutura Tecnológica", label: "Se sim, qual?", type: "text", required: false, conditionalOn: { questionId: "q11", value: "Sim" } },
  { id: "q13", section: "Informações Gerais da Instituição", subsection: "Infraestrutura Tecnológica", label: "Qual é o nível de conectividade de internet na instituição?", type: "radio", required: true, options: ["Excelente", "Boa", "Regular", "Ruim", "Sem internet"] },
  { id: "q14", section: "Informações Gerais da Instituição", subsection: "Infraestrutura Tecnológica", label: "Seus professores têm acesso a computadores/tablets para trabalho?", type: "radio", required: true, options: ["Sim, todos", "Sim, alguns", "Não"] },
  { id: "q15", section: "Informações Gerais da Instituição", subsection: "Infraestrutura Tecnológica", label: "Sua instituição já utiliza plataformas digitais para ensino?", type: "radio", required: true, options: ["Sim", "Não"] },
  { id: "q16", section: "Informações Gerais da Instituição", subsection: "Infraestrutura Tecnológica", label: "Se sim, quais?", type: "text", required: false, conditionalOn: { questionId: "q15", value: "Sim" } },

  // SEÇÃO 2: EDUCAÇÃO INCLUSIVA E NECESSIDADES ESPECIAIS
  // 2.1 Alunos com Necessidades Especiais
  { id: "q17", section: "Educação Inclusiva e Necessidades Especiais", subsection: "Alunos com Necessidades Especiais", label: "Sua instituição atende alunos com necessidades educacionais especiais?", type: "radio", required: true, options: ["Sim", "Não"] },
  { id: "q18", section: "Educação Inclusiva e Necessidades Especiais", subsection: "Alunos com Necessidades Especiais", label: "Se sim, quantos alunos aproximadamente?", type: "number", required: false, conditionalOn: { questionId: "q17", value: "Sim" } },
  { id: "q19", section: "Educação Inclusiva e Necessidades Especiais", subsection: "Alunos com Necessidades Especiais", label: "Quais são os tipos de necessidades especiais que você atende?", type: "checkbox", required: false, options: ["Autismo (TEA)", "TDAH", "Deficiência física", "Deficiência visual", "Deficiência auditiva", "Dislexia", "Síndrome de Down", "Outras"] },
  { id: "q20", section: "Educação Inclusiva e Necessidades Especiais", subsection: "Alunos com Necessidades Especiais", label: "Se outras, quais?", type: "text", required: false, conditionalOn: { questionId: "q19", value: "Outras" } },
  // 2.2 Desafios Atuais na Inclusão
  { id: "q21", section: "Educação Inclusiva e Necessidades Especiais", subsection: "Desafios Atuais na Inclusão", label: "Qual é o maior desafio que você enfrenta ao trabalhar com alunos com necessidades especiais?", type: "textarea", required: true },
  { id: "q22", section: "Educação Inclusiva e Necessidades Especiais", subsection: "Desafios Atuais na Inclusão", label: "Seus professores têm treinamento específico em educação inclusiva?", type: "radio", required: true, options: ["Sim, todos", "Sim, alguns", "Não"] },
  { id: "q23", section: "Educação Inclusiva e Necessidades Especiais", subsection: "Desafios Atuais na Inclusão", label: "Com que frequência seus professores recebem capacitação/treinamento?", type: "radio", required: true, options: ["Mensal", "Trimestral", "Semestral", "Anual", "Nunca"] },
  { id: "q24", section: "Educação Inclusiva e Necessidades Especiais", subsection: "Desafios Atuais na Inclusão", label: "Você gostaria de oferecer mais serviços de educação inclusiva?", type: "radio", required: true, options: ["Sim", "Não"] },
  { id: "q25", section: "Educação Inclusiva e Necessidades Especiais", subsection: "Desafios Atuais na Inclusão", label: "Se sim, o que o impede?", type: "checkbox", required: false, options: ["Falta de recursos financeiros", "Falta de profissionais qualificados", "Falta de materiais", "Falta de espaço físico", "Outro"], conditionalOn: { questionId: "q24", value: "Sim" } },
  { id: "q26", section: "Educação Inclusiva e Necessidades Especiais", subsection: "Desafios Atuais na Inclusão", label: "Se outro, qual?", type: "text", required: false, conditionalOn: { questionId: "q25", value: "Outro" } },

  // SEÇÃO 3: DORES PEDAGÓGICAS E OPERACIONAIS
  // 3.1 Desafios no Ensino
  { id: "q27", section: "Dores Pedagógicas e Operacionais", subsection: "Desafios no Ensino", label: "Qual é o maior desafio pedagógico que você enfrenta atualmente?", type: "textarea", required: true },
  { id: "q28", section: "Dores Pedagógicas e Operacionais", subsection: "Desafios no Ensino", label: "Como você avalia o desempenho acadêmico geral de seus alunos?", type: "radio", required: true, options: ["Excelente", "Bom", "Regular", "Ruim"] },
  { id: "q29", section: "Dores Pedagógicas e Operacionais", subsection: "Desafios no Ensino", label: "Qual é o principal fator que limita o desempenho dos alunos?", type: "text", required: true },
  { id: "q30", section: "Dores Pedagógicas e Operacionais", subsection: "Desafios no Ensino", label: "Como você identifica alunos com dificuldades de aprendizagem?", type: "textarea", required: true },
  { id: "q31", section: "Dores Pedagógicas e Operacionais", subsection: "Desafios no Ensino", label: "Seus professores têm dificuldade em diagnosticar problemas de aprendizagem?", type: "radio", required: true, options: ["Sim", "Não", "Parcialmente"] },
  // 3.2 Desafios Operacionais
  { id: "q32", section: "Dores Pedagógicas e Operacionais", subsection: "Desafios Operacionais", label: "Qual é o maior desafio operacional que você enfrenta?", type: "text", required: true },
  { id: "q33", section: "Dores Pedagógicas e Operacionais", subsection: "Desafios Operacionais", label: "Quanto tempo seus professores gastam com tarefas administrativas?", type: "radio", required: true, options: ["Menos de 1h/dia", "1-2h/dia", "2-4h/dia", "Mais de 4h/dia"] },
  { id: "q34", section: "Dores Pedagógicas e Operacionais", subsection: "Desafios Operacionais", label: "Você possui materiais didáticos especializados para educação inclusiva?", type: "radio", required: true, options: ["Sim, suficientes", "Sim, mas insuficientes", "Não"] },
  { id: "q35", section: "Dores Pedagógicas e Operacionais", subsection: "Desafios Operacionais", label: "Como você avalia a qualidade dos materiais didáticos disponíveis?", type: "radio", required: true, options: ["Excelente", "Boa", "Regular", "Ruim"] },
  { id: "q36", section: "Dores Pedagógicas e Operacionais", subsection: "Desafios Operacionais", label: "Qual é o maior custo operacional de sua instituição?", type: "text", required: true },

  // SEÇÃO 4: VISÃO ESTRATÉGICA E OPORTUNIDADES
  // 4.1 Objetivos Futuros
  { id: "q37", section: "Visão Estratégica e Oportunidades", subsection: "Objetivos Futuros", label: "Quais são seus principais objetivos para os próximos 2 anos?", type: "textarea", required: true },
  { id: "q38", section: "Visão Estratégica e Oportunidades", subsection: "Objetivos Futuros", label: "Você planeja expandir sua instituição?", type: "radio", required: true, options: ["Sim, nos próximos 6 meses", "Sim, nos próximos 1-2 anos", "Talvez no futuro", "Não"] },
  { id: "q39", section: "Visão Estratégica e Oportunidades", subsection: "Objetivos Futuros", label: "Qual seria o diferencial competitivo ideal para sua instituição?", type: "textarea", required: true },
  // 4.2 Disposição para Inovação
  { id: "q40", section: "Visão Estratégica e Oportunidades", subsection: "Disposição para Inovação", label: "Sua instituição está aberta para adotar novas tecnologias?", type: "radio", required: true, options: ["Sim, totalmente", "Sim, com cautela", "Talvez", "Não"] },
  { id: "q41", section: "Visão Estratégica e Oportunidades", subsection: "Disposição para Inovação", label: "Qual seria o principal benefício que você buscaria em uma nova tecnologia?", type: "checkbox", required: true, options: ["Redução de custos", "Melhoria na qualidade do ensino", "Melhor gestão administrativa", "Inclusão de alunos especiais", "Comunicação com pais", "Outro"] },
  { id: "q42", section: "Visão Estratégica e Oportunidades", subsection: "Disposição para Inovação", label: "Se outro, qual?", type: "text", required: false, conditionalOn: { questionId: "q41", value: "Outro" } },
  // 4.3 Capacidade de Investimento
  { id: "q43", section: "Visão Estratégica e Oportunidades", subsection: "Capacidade de Investimento", label: "Sua instituição tem capacidade de investir em novas soluções?", type: "radio", required: true, options: ["Sim", "Talvez", "Não no momento"] },
  { id: "q44", section: "Visão Estratégica e Oportunidades", subsection: "Capacidade de Investimento", label: "Qual seria o modelo de investimento mais adequado para sua instituição?", type: "radio", required: true, options: ["Assinatura mensal", "Pagamento anual", "Pagamento por uso", "Investimento único"] },
  { id: "q45", section: "Visão Estratégica e Oportunidades", subsection: "Capacidade de Investimento", label: "Qual seria um investimento mensal aceitável para uma solução educacional?", type: "radio", required: true, options: ["Até R$ 500", "R$ 500 - R$ 1.000", "R$ 1.000 - R$ 3.000", "R$ 3.000 - R$ 5.000", "Acima de R$ 5.000"] },
  { id: "q46", section: "Visão Estratégica e Oportunidades", subsection: "Capacidade de Investimento", label: "Qual seu Faturamento Anual?", type: "radio", required: true, options: ["Até R$ 100.000", "R$ 100.000 - R$ 500.000", "R$ 500.000 - R$ 1.000.000", "R$ 1.000.000 - R$ 5.000.000", "Acima de R$ 5.000.000"] },

  // SEÇÃO 5: INFORMAÇÕES DE CONTATO E PRÓXIMOS PASSOS
  // 5.1 Contato
  { id: "q47", section: "Informações de Contato e Próximos Passos", subsection: "Contato", label: "Qual é o melhor email para entrarmos em contato?", type: "email", required: true },
  { id: "q48", section: "Informações de Contato e Próximos Passos", subsection: "Contato", label: "Qual é o melhor telefone/WhatsApp?", type: "phone", required: true },
  { id: "q49", section: "Informações de Contato e Próximos Passos", subsection: "Contato", label: "Qual é a melhor hora/dia para uma reunião?", type: "text", required: false },
  // 5.2 Autorização
  { id: "q50", section: "Informações de Contato e Próximos Passos", subsection: "Autorização", label: "Você autoriza que os dados deste formulário sejam utilizados para análise e contato?", type: "radio", required: true, options: ["Sim", "Não"] },
  { id: "q51", section: "Informações de Contato e Próximos Passos", subsection: "Autorização", label: "Você gostaria de receber informações sobre educação inclusiva e tecnologia?", type: "radio", required: true, options: ["Sim", "Não"] },
];

export function getSections(questions: FormQuestion[]): string[] {
  const sections: string[] = [];
  for (const q of questions) {
    if (!sections.includes(q.section)) sections.push(q.section);
  }
  return sections;
}
