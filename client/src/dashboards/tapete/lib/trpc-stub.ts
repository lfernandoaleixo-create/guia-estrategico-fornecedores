/**
 * Stub local do trpc.diario.* — replica fielmente a API original do tRPC,
 * mas persiste tudo em localStorage. Permite que a UI de Anotações funcione
 * sem servidor / login.
 */
import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import type { Negociacao, EntradaDiario } from "./types";

// ─── Storage ──────────────────────────────────────────────────────────────────

const NEG_KEY = "tapete-negociacoes-v1";
const ENT_KEY = "tapete-entradas-diario-v1";

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() {
  listeners.forEach(l => l());
}

function loadNegs(): Negociacao[] {
  try {
    const raw = localStorage.getItem(NEG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveNegs(arr: Negociacao[]) {
  try {
    localStorage.setItem(NEG_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}
function loadEnts(): EntradaDiario[] {
  try {
    const raw = localStorage.getItem(ENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveEnts(arr: EntradaDiario[]) {
  try {
    localStorage.setItem(ENT_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

// Storage cross-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", e => {
    if (e.key === NEG_KEY || e.key === ENT_KEY) emit();
  });
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function nextId(arr: { id: number }[]): number {
  return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1;
}

// ─── Hooks no formato trpc-like ───────────────────────────────────────────────

type QueryResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  refetch: () => void;
};

function useStore<T>(read: () => T): T {
  // Re-render quando muda (subscription) e re-lê value
  return useSyncExternalStore(
    subscribe,
    read,
    read,
  );
}

function useListarNegociacoes(): QueryResult<Negociacao[]> {
  const data = useStore(loadNegs);
  return {
    data,
    isLoading: false,
    refetch: () => emit(),
  };
}

function useListarEntradas(
  input: { negociacaoId: number },
  opts: { enabled?: boolean } = {},
): QueryResult<EntradaDiario[]> {
  const enabled = opts.enabled ?? true;
  const data = useStore(() => {
    if (!enabled) return undefined;
    return loadEnts()
      .filter(e => e.negociacaoId === input.negociacaoId)
      .sort((a, b) => b.dataEntrada - a.dataEntrada);
  });
  return {
    data: enabled ? data : undefined,
    isLoading: false,
    refetch: () => emit(),
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

type MutationOptions<TInput, TOutput> = {
  onSuccess?: (data: TOutput, vars: TInput) => void;
  onError?: (err: Error, vars: TInput) => void;
};

type Mutation<TInput, TOutput> = {
  mutate: (vars: TInput, opts?: { onSuccess?: (d: TOutput) => void }) => void;
  mutateAsync: (vars: TInput) => Promise<TOutput>;
  isPending: boolean;
};

function useMutation<TInput, TOutput>(
  fn: (vars: TInput) => Promise<TOutput> | TOutput,
  opts?: MutationOptions<TInput, TOutput>,
): Mutation<TInput, TOutput> {
  const [isPending, setPending] = useState(false);
  const mutateAsync = useCallback(
    async (vars: TInput) => {
      setPending(true);
      try {
        const result = await fn(vars);
        opts?.onSuccess?.(result, vars);
        return result;
      } catch (err) {
        opts?.onError?.(err as Error, vars);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [fn, opts],
  );
  const mutate = useCallback(
    (vars: TInput, localOpts?: { onSuccess?: (d: TOutput) => void }) => {
      mutateAsync(vars)
        .then(d => localOpts?.onSuccess?.(d))
        .catch(() => {});
    },
    [mutateAsync],
  );
  return { mutate, mutateAsync, isPending };
}

// ─── API trpc-stub ────────────────────────────────────────────────────────────

function salvarNegociacao(input: {
  empresaId: string;
  categoria: "fabrica" | "trader" | "materia_prima";
  nomeEmpresa: string;
  status: string;
  prioridade: "alta" | "media" | "baixa";
}): Negociacao {
  const arr = loadNegs();
  const idx = arr.findIndex(n => n.empresaId === input.empresaId);
  const now = Date.now();
  if (idx >= 0) {
    arr[idx] = { ...arr[idx], ...input, updatedAt: now };
    saveNegs(arr);
    emit();
    return arr[idx];
  }
  const item: Negociacao = {
    id: nextId(arr),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  arr.unshift(item);
  saveNegs(arr);
  emit();
  return item;
}

function criarEntrada(input: {
  negociacaoId: number;
  funcionario: string;
  canal: string;
  anotacao: string;
  statusEntrada: string;
  prioridadeEntrada: "alta" | "media" | "baixa";
  anexos?: string;
  dataEntrada: number;
}): EntradaDiario {
  const arr = loadEnts();
  const item: EntradaDiario = {
    id: nextId(arr),
    ...input,
    createdAt: Date.now(),
  };
  arr.push(item);
  saveEnts(arr);
  emit();
  return item;
}

function uploadAnexo(input: {
  fileName: string;
  mimeType: string;
  base64: string;
  empresaId: string;
}): { nome: string; url: string; key: string } {
  // No backend real, faria upload S3. Aqui mantemos como dataURL local.
  const dataUrl = `data:${input.mimeType};base64,${input.base64}`;
  const key = `${input.empresaId}-${Date.now()}-${input.fileName}`;
  return { nome: input.fileName, url: dataUrl, key };
}

function deletarEntrada(input: { id: number }) {
  const arr = loadEnts().filter(e => e.id !== input.id);
  saveEnts(arr);
  emit();
  return { ok: true };
}

// ─── Utils helpers semelhantes ao trpc.useUtils() ─────────────────────────────

const utils = {
  diario: {
    listarNegociacoes: {
      invalidate: async () => {
        emit();
      },
    },
    listarEntradas: {
      invalidate: async (_input?: { negociacaoId: number }) => {
        emit();
      },
    },
  },
};

// ─── Export trpc compatível ───────────────────────────────────────────────────

export const trpc = {
  useUtils: () => utils,
  diario: {
    listarNegociacoes: {
      useQuery: () => useListarNegociacoes(),
    },
    listarEntradas: {
      useQuery: (input: { negociacaoId: number }, opts?: { enabled?: boolean }) =>
        useListarEntradas(input, opts),
    },
    salvarNegociacao: {
      useMutation: (opts?: MutationOptions<Parameters<typeof salvarNegociacao>[0], Negociacao>) =>
        useMutation(salvarNegociacao, opts),
    },
    criarEntrada: {
      useMutation: (opts?: MutationOptions<Parameters<typeof criarEntrada>[0], EntradaDiario>) =>
        useMutation(criarEntrada, opts),
    },
    uploadAnexo: {
      useMutation: (
        opts?: MutationOptions<
          Parameters<typeof uploadAnexo>[0],
          { nome: string; url: string; key: string }
        >,
      ) => useMutation(uploadAnexo, opts),
    },
    deletarEntrada: {
      useMutation: (opts?: MutationOptions<Parameters<typeof deletarEntrada>[0], { ok: boolean }>) =>
        useMutation(deletarEntrada, opts),
    },
  },
};

// re-exports só para que o código original "import type" continue funcionando
export type { Negociacao, EntradaDiario };

// suprimir warning de import não usado
export const __KEEP__ = useEffect;
