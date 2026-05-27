/**
 * Stub local do trpc.diario.* — replica fielmente a API original do tRPC,
 * mas persiste tudo em localStorage. Permite que a UI de Anotações funcione
 * sem servidor / login.
 *
 * IMPORTANTE: Para evitar loop infinito com useSyncExternalStore,
 * mantemos referências CACHEADAS dos arrays de Negociacoes/Entradas e só as
 * substituímos quando há mutação real. Isso garante que getSnapshot retorne
 * a mesma referência entre chamadas se nada mudou.
 */
import { useEffect, useState, useCallback, useSyncExternalStore, useMemo } from "react";
import type { Negociacao, EntradaDiario } from "./types";

// ─── Storage ──────────────────────────────────────────────────────────────────

const NEG_KEY = "tapete-negociacoes-v1";
const ENT_KEY = "tapete-entradas-diario-v1";

type Listener = () => void;
const listeners = new Set<Listener>();

// Caches estáveis — só mudam quando há mutação
let cachedNegs: Negociacao[] | null = null;
let cachedEnts: EntradaDiario[] | null = null;

function loadNegsRaw(): Negociacao[] {
  try {
    const raw = localStorage.getItem(NEG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadEntsRaw(): EntradaDiario[] {
  try {
    const raw = localStorage.getItem(ENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getNegs(): Negociacao[] {
  if (cachedNegs === null) {
    cachedNegs = loadNegsRaw();
  }
  return cachedNegs;
}

function getEnts(): EntradaDiario[] {
  if (cachedEnts === null) {
    cachedEnts = loadEntsRaw();
  }
  return cachedEnts;
}

function saveNegs(arr: Negociacao[]) {
  cachedNegs = arr;
  try {
    localStorage.setItem(NEG_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

function saveEnts(arr: EntradaDiario[]) {
  cachedEnts = arr;
  try {
    localStorage.setItem(ENT_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

function emit() {
  listeners.forEach(l => l());
}

// Storage cross-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", e => {
    if (e.key === NEG_KEY) {
      cachedNegs = null; // força re-load
      emit();
    } else if (e.key === ENT_KEY) {
      cachedEnts = null;
      emit();
    }
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

function useNegs(): Negociacao[] {
  return useSyncExternalStore(subscribe, getNegs, getNegs);
}

function useEnts(): EntradaDiario[] {
  return useSyncExternalStore(subscribe, getEnts, getEnts);
}

function useListarNegociacoes(): QueryResult<Negociacao[]> {
  const data = useNegs();
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
  const allEnts = useEnts();
  // Filtrar/sort de forma memoizada — referência estável
  const data = useMemo(() => {
    if (!enabled) return undefined;
    return allEnts
      .filter(e => e.negociacaoId === input.negociacaoId)
      .sort((a, b) => b.dataEntrada - a.dataEntrada);
  }, [allEnts, enabled, input.negociacaoId]);
  return {
    data,
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
    // fn e opts geralmente são novos a cada render — não os incluímos
    // para manter a referência estável (callback latest pattern)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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

// ─── Mutation logic (impl) ────────────────────────────────────────────────────

function salvarNegociacao(input: {
  empresaId: string;
  categoria: "fabrica" | "trader" | "materia_prima";
  nomeEmpresa: string;
  status: string;
  prioridade: "alta" | "media" | "baixa";
}): Negociacao {
  const arr = [...getNegs()];
  const idx = arr.findIndex(n => n.empresaId === input.empresaId);
  const now = Date.now();
  let item: Negociacao;
  if (idx >= 0) {
    item = { ...arr[idx], ...input, updatedAt: now };
    arr[idx] = item;
  } else {
    item = {
      id: nextId(arr),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    arr.unshift(item);
  }
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
  const arr = [...getEnts()];
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
  const dataUrl = `data:${input.mimeType};base64,${input.base64}`;
  const key = `${input.empresaId}-${Date.now()}-${input.fileName}`;
  return { nome: input.fileName, url: dataUrl, key };
}

function deletarEntrada(input: { id: number }) {
  const arr = getEnts().filter(e => e.id !== input.id);
  saveEnts(arr);
  emit();
  return { ok: true };
}

// ─── Utils helpers semelhantes ao trpc.useUtils() ─────────────────────────────

const utils = {
  diario: {
    listarNegociacoes: {
      invalidate: async () => {
        cachedNegs = null;
        emit();
      },
    },
    listarEntradas: {
      invalidate: async (_input?: { negociacaoId: number }) => {
        cachedEnts = null;
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
