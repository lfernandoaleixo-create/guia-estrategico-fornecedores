// =============================================================================
// Field presets — Conjuntos padronizados de campos editáveis para os 3 dashboards
// O operador preenche estas informações ao fazer contato com cada fornecedor.
// =============================================================================

import type { EditableField } from "./SupplierNotesPanel";

/**
 * Conjunto padrão de campos que TODOS os 3 dashboards usam.
 * Cobre o essencial para um operador internacional:
 * - identificação do interlocutor,
 * - canais de contato,
 * - condições comerciais negociadas.
 */
export const DEFAULT_EDITABLE_FIELDS: EditableField[] = [
  {
    key: "contato_nome",
    label: "Pessoa de Contato",
    placeholder: "Ex: Mr. Wang Lin / Sra. Liu",
  },
  {
    key: "contato_cargo",
    label: "Cargo / Função",
    placeholder: "Ex: Sales Manager, Export Director",
  },
  {
    key: "contato_email",
    label: "E-mail",
    placeholder: "exemplo@empresa.com",
    type: "email",
  },
  {
    key: "contato_whatsapp",
    label: "WhatsApp / WeChat",
    placeholder: "+86 139 0000 0000",
    type: "tel",
  },
  {
    key: "contato_telefone",
    label: "Telefone Comercial",
    placeholder: "+86 21 0000 0000",
    type: "tel",
  },
  {
    key: "idioma",
    label: "Idioma de Comunicação",
    placeholder: "Inglês / Mandarim / Português",
  },
  {
    key: "moq",
    label: "MOQ Negociado",
    placeholder: "Ex: 100 unidades, 1 contêiner",
  },
  {
    key: "preco_referencia",
    label: "Preço de Referência (FOB)",
    placeholder: "Ex: US$ 12,50/un",
  },
  {
    key: "lead_time",
    label: "Lead Time",
    placeholder: "Ex: 30 dias após pagamento",
  },
  {
    key: "forma_pagamento",
    label: "Forma de Pagamento",
    placeholder: "Ex: 30% T/T antecipado + 70% contra B/L",
  },
  {
    key: "incoterm",
    label: "Incoterm",
    placeholder: "Ex: FOB Ningbo, CIF Santos",
  },
  {
    key: "proximo_passo",
    label: "Próximo Passo",
    placeholder: "Ex: Enviar pedido formal até 10/06",
  },
];
