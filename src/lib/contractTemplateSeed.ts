/**
 * 5 templates pré-configurados de contratos com macros dinâmicas.
 */
export const seedContractTemplates = [
  {
    name: "Contrato de Venda",
    type: "sales",
    description: "Template padrão para contratos de venda de produtos ou serviços",
    is_active: true,
    content: `CONTRATO DE VENDA

CONTRATANTE: {{account_name}}, inscrita no CNPJ {{account_cnpj}}, neste ato representada por {{contact_name}}, {{contact_position}}.

CONTRATADA: (Empresa), neste ato representada por {{user_name}}.

CLÁUSULA 1 – OBJETO
O presente contrato tem por objeto a venda referente ao negócio "{{deal_name}}", conforme condições aqui estabelecidas.

CLÁUSULA 2 – VALOR E PAGAMENTO
O valor total deste contrato é de {{contract_value}} ({{contract_currency}}), correspondente ao negócio no valor de {{deal_value}}.

CLÁUSULA 3 – VIGÊNCIA
Este contrato terá vigência de {{contract_start_date}} a {{contract_end_date}}.

CLÁUSULA 4 – OBRIGAÇÕES DA CONTRATADA
A Contratada se compromete a entregar os produtos/serviços descritos no objeto deste contrato dentro do prazo estipulado.

CLÁUSULA 5 – OBRIGAÇÕES DA CONTRATANTE
A Contratante se compromete a efetuar o pagamento nas condições acordadas.

CLÁUSULA 6 – RESCISÃO
O presente contrato poderá ser rescindido por qualquer das partes mediante notificação prévia de 30 (trinta) dias.

CLÁUSULA 7 – FORO
Fica eleito o foro da comarca da sede da Contratada para dirimir quaisquer dúvidas oriundas do presente instrumento.

Local e data: {{current_date_full}}

_________________________
{{account_name}}
{{contact_name}}

_________________________
{{user_name}}
{{user_email}}`,
  },
  {
    name: "Contrato de Serviço",
    type: "service",
    description: "Template padrão para contratos de prestação de serviços",
    is_active: true,
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{account_name}}, CNPJ {{account_cnpj}}, representada por {{contact_name}}, {{contact_position}}.

CONTRATADA: (Empresa), representada por {{user_name}}.

CLÁUSULA 1 – OBJETO
Prestação de serviços conforme descrito no negócio "{{deal_name}}", incluindo todas as atividades necessárias à sua execução.

CLÁUSULA 2 – VALOR
Pelo serviço prestado, a Contratante pagará à Contratada o valor de {{contract_value}}.

CLÁUSULA 3 – PRAZO
Os serviços serão executados no período de {{contract_start_date}} a {{contract_end_date}}, podendo ser renovado mediante acordo entre as partes. Data de renovação prevista: {{contract_renewal_date}}.

CLÁUSULA 4 – OBRIGAÇÕES DA CONTRATADA
a) Executar os serviços com qualidade e dentro dos prazos;
b) Manter sigilo sobre informações confidenciais;
c) Comunicar eventuais impedimentos com antecedência.

CLÁUSULA 5 – OBRIGAÇÕES DA CONTRATANTE
a) Fornecer as informações e acessos necessários;
b) Efetuar os pagamentos nos prazos acordados;
c) Designar um responsável para acompanhamento.

CLÁUSULA 6 – CONFIDENCIALIDADE
As partes se comprometem a manter sigilo sobre todas as informações trocadas durante a vigência deste contrato.

CLÁUSULA 7 – RESCISÃO
Qualquer parte poderá rescindir este contrato mediante aviso prévio de 30 dias, sem prejuízo das obrigações já assumidas.

CLÁUSULA 8 – FORO
Foro da comarca da sede da Contratada.

{{current_date_full}}

_________________________
{{contact_name}} – {{account_name}}

_________________________
{{user_name}} – {{user_email}}`,
  },
  {
    name: "Contrato de Fornecimento",
    type: "supply",
    description: "Template padrão para contratos com fornecedores",
    is_active: true,
    content: `CONTRATO DE FORNECIMENTO

CONTRATANTE: (Empresa), representada por {{user_name}}.

FORNECEDORA: {{account_name}}, CNPJ {{account_cnpj}}, representada por {{contact_name}}, {{contact_position}}.
Contato: {{contact_email}} | {{contact_phone}}

CLÁUSULA 1 – OBJETO
Fornecimento de materiais/produtos conforme especificado no negócio "{{deal_name}}".

CLÁUSULA 2 – VALOR E CONDIÇÕES DE PAGAMENTO
O valor total do fornecimento é de {{contract_value}}, referente ao negócio estimado em {{deal_value}}.

CLÁUSULA 3 – PRAZO DE ENTREGA E VIGÊNCIA
Vigência: {{contract_start_date}} a {{contract_end_date}}.
As entregas deverão ocorrer conforme cronograma a ser acordado entre as partes.

CLÁUSULA 4 – QUALIDADE
A Fornecedora garante que os produtos entregues atenderão às especificações técnicas acordadas.

CLÁUSULA 5 – PENALIDADES
O atraso na entrega sujeitará a Fornecedora a multa de 2% sobre o valor da parcela em atraso, acrescida de juros de 1% ao mês.

CLÁUSULA 6 – RESCISÃO
O contrato poderá ser rescindido por descumprimento de qualquer cláusula, mediante notificação prévia de 15 dias.

CLÁUSULA 7 – FORO
Foro da comarca da sede da Contratante.

{{current_date_full}}

_________________________
{{user_name}}

_________________________
{{contact_name}} – {{account_name}}`,
  },
  {
    name: "Acordo de Confidencialidade (NDA)",
    type: "nda",
    description: "Template padrão para Acordo de Confidencialidade",
    is_active: true,
    content: `ACORDO DE CONFIDENCIALIDADE (NDA)

PARTE REVELADORA: (Empresa), representada por {{user_name}} ({{user_email}}).

PARTE RECEPTORA: {{account_name}}, CNPJ {{account_cnpj}}, representada por {{contact_name}}, {{contact_position}}.

CLÁUSULA 1 – OBJETO
As partes celebram o presente Acordo de Confidencialidade com o objetivo de proteger informações confidenciais trocadas no âmbito do negócio "{{deal_name}}".

CLÁUSULA 2 – DEFINIÇÃO DE INFORMAÇÃO CONFIDENCIAL
Considera-se "Informação Confidencial" toda e qualquer informação, técnica ou comercial, divulgada por uma parte à outra, seja por escrito, verbalmente ou por qualquer outro meio.

CLÁUSULA 3 – OBRIGAÇÕES DA PARTE RECEPTORA
a) Não divulgar as informações confidenciais a terceiros;
b) Utilizar as informações apenas para os fins previstos;
c) Proteger as informações com o mesmo grau de cuidado dispensado às suas próprias informações confidenciais;
d) Restringir o acesso às informações apenas aos colaboradores que necessitem conhecê-las.

CLÁUSULA 4 – EXCEÇÕES
Não serão consideradas confidenciais as informações que:
a) Sejam de domínio público;
b) Já eram conhecidas pela Parte Receptora antes da divulgação;
c) Forem obtidas legitimamente de terceiros sem restrição de confidencialidade.

CLÁUSULA 5 – VIGÊNCIA
Este acordo vigorará de {{contract_start_date}} a {{contract_end_date}}, permanecendo as obrigações de confidencialidade por 2 (dois) anos após o término.

CLÁUSULA 6 – PENALIDADES
A violação deste acordo sujeitará a parte infratora ao pagamento de indenização por perdas e danos, sem prejuízo das demais sanções legais.

CLÁUSULA 7 – FORO
Foro da comarca da sede da Parte Reveladora.

{{current_date_full}}

_________________________
{{user_name}} – Parte Reveladora

_________________________
{{contact_name}} – {{account_name}} – Parte Receptora`,
  },
  {
    name: "Contrato de Parceria",
    type: "custom",
    description: "Template padrão para contratos de parceria comercial",
    is_active: true,
    content: `CONTRATO DE PARCERIA COMERCIAL

PARCEIRO A: (Empresa), representada por {{user_name}} ({{user_email}}).

PARCEIRO B: {{account_name}}, CNPJ {{account_cnpj}}, representada por {{contact_name}}, {{contact_position}}.
E-mail: {{contact_email}} | Telefone: {{contact_phone}}

CLÁUSULA 1 – OBJETO
As partes firmam parceria comercial para desenvolvimento conjunto do negócio "{{deal_name}}", unindo esforços e competências para atingir objetivos comuns.

CLÁUSULA 2 – RESPONSABILIDADES
PARCEIRO A:
a) Fornecer a infraestrutura tecnológica necessária;
b) Garantir suporte técnico durante a vigência.

PARCEIRO B:
a) Contribuir com conhecimento de mercado e carteira de clientes;
b) Participar ativamente das ações comerciais acordadas.

CLÁUSULA 3 – INVESTIMENTO E REPARTIÇÃO
O investimento total previsto é de {{contract_value}} (valor do negócio: {{deal_value}}), a ser dividido conforme acordo específico entre as partes.

CLÁUSULA 4 – VIGÊNCIA
A parceria terá vigência de {{contract_start_date}} a {{contract_end_date}}, com possibilidade de renovação em {{contract_renewal_date}}.

CLÁUSULA 5 – PROPRIEDADE INTELECTUAL
Os direitos de propriedade intelectual sobre materiais desenvolvidos em conjunto serão compartilhados entre as partes, salvo acordo específico em contrário.

CLÁUSULA 6 – CONFIDENCIALIDADE
As partes se obrigam a manter sigilo sobre todas as informações estratégicas e comerciais compartilhadas durante a parceria.

CLÁUSULA 7 – RESCISÃO
A parceria poderá ser encerrada por qualquer das partes mediante notificação prévia de 60 (sessenta) dias, garantindo a conclusão de projetos em andamento.

CLÁUSULA 8 – FORO
Foro da comarca de comum acordo entre as partes.

{{current_date_full}}

_________________________
{{user_name}} – Parceiro A

_________________________
{{contact_name}} – {{account_name}} – Parceiro B`,
  },
];
