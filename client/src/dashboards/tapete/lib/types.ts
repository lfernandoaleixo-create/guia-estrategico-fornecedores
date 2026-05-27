// Tipos compatíveis com o schema original (drizzle), mas usados em runtime local (localStorage)

export type Negociacao = {
  id: number;
  empresaId: string;
  categoria: "fabrica" | "trader" | "materia_prima";
  nomeEmpresa: string;
  status: string;
  prioridade: "alta" | "media" | "baixa";
  createdAt?: number;
  updatedAt?: number;
};

export type EntradaDiario = {
  id: number;
  negociacaoId: number;
  funcionario: string;
  canal: string;
  anotacao: string;
  statusEntrada: string;
  prioridadeEntrada: "alta" | "media" | "baixa";
  anexos?: string; // JSON string
  dataEntrada: number;
  createdAt?: number;
};
