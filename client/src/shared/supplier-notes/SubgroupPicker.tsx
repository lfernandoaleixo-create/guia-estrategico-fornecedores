// =============================================================================
// SubgroupPicker — escolhe ou cria um SUBGRUPO (modelo "macro.sub") para o
// fornecedor que está sendo cadastrado.
//
// - Lista os subgrupos existentes (ordenados por macro.sub) como "chips".
// - Permite criar um novo subgrupo digitando LIVREMENTE o número (ex.: 1.4) e o
//   nome. A criação é BLOQUEADA se o macro digitado não existir (validação via
//   validateSubgroupNumber) — exibe mensagem orientando a criar o macro antes.
//
// Controlado: recebe `selectedId` (id do subgrupo) e dispara `onChange(id|null)`.
// =============================================================================
import { useMemo, useState } from "react";
import { Plus, Check } from "lucide-react";
import { useMacros } from "./useMacros";
import { useSubgroups, type Subgroup } from "./useSubgroups";
import {
  formatSubgroupNumber,
  formatSubgroupLabel,
  validateSubgroupNumber,
  subgroupErrorMessage,
} from "./subgroupNumber";

interface Props {
  tone?: "dark" | "light";
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

export function SubgroupPicker({ tone = "light", selectedId, onChange }: Props) {
  const isDark = tone === "dark";
  const { macros } = useMacros();
  const { subgroups, createSubgroup } = useSubgroups();

  const [creating, setCreating] = useState(false);
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const macroNumbers = useMemo(
    () => macros.map((m) => m.number).filter((n) => Number.isFinite(n)),
    [macros],
  );
  const macroNameByNumber = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of macros) map.set(m.number, m.name);
    return map;
  }, [macros]);

  const chipBase =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer select-none";
  const chipOff = isDark
    ? "bg-white/5 border-white/15 text-white/80 hover:bg-white/10"
    : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50";
  const inputCls = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-emerald-400/60"
    : "bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500";
  const labelCls = isDark ? "text-white/70" : "text-zinc-600";

  async function handleCreate() {
    setError(null);
    const result = validateSubgroupNumber({
      raw: num,
      existingMacroNumbers: macroNumbers,
      existingSubgroups: subgroups.map((s) => ({
        macroNumber: s.macroNumber,
        sub: s.sub,
        id: s.id,
      })),
    });
    if (!result.ok || !result.parsed) {
      setError(subgroupErrorMessage(result.error, result.parsed?.macroNumber));
      return;
    }
    if (!name.trim()) {
      setError("Dê um nome ao subgrupo (ex.: Terrário, Coleira de Cachorro).");
      return;
    }
    setSaving(true);
    try {
      const created = await createSubgroup({
        macroNumber: result.parsed.macroNumber,
        sub: result.parsed.sub,
        name: name.trim(),
      });
      if (created) {
        onChange(created.id);
        setCreating(false);
        setNum("");
        setName("");
      }
    } catch (e) {
      setError(`Falha ao criar subgrupo: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {subgroups.length === 0 && !creating && (
        <p className={`text-xs ${labelCls}`}>
          Nenhum subgrupo criado ainda. Clique em “+ novo subgrupo” para criar o
          primeiro (ex.: 1.1 - Terrário).
        </p>
      )}

      {subgroups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* Opção "nenhum" */}
          <span
            role="button"
            tabIndex={0}
            onClick={() => onChange(null)}
            className={`${chipBase} ${
              selectedId === null
                ? isDark
                  ? "bg-amber-500 border-amber-400 text-zinc-950"
                  : "bg-zinc-900 border-zinc-900 text-white"
                : chipOff
            }`}
          >
            Sem subgrupo
          </span>

          {subgroups.map((sg: Subgroup) => {
            const selected = sg.id === selectedId;
            const num = formatSubgroupNumber(sg.macroNumber, sg.sub);
            return (
              <span
                key={sg.id}
                role="button"
                tabIndex={0}
                onClick={() => onChange(sg.id)}
                title={`Macro Nº ${sg.macroNumber}${
                  macroNameByNumber.get(sg.macroNumber)
                    ? ` (${macroNameByNumber.get(sg.macroNumber)})`
                    : ""
                }`}
                className={`${chipBase} ${
                  selected
                    ? "text-white border-transparent"
                    : chipOff
                }`}
                style={
                  selected
                    ? { backgroundColor: sg.color, borderColor: sg.color }
                    : { borderLeft: `4px solid ${sg.color}` }
                }
              >
                {selected && <Check className="w-3.5 h-3.5" />}
                <span className="font-bold">{num}</span>
                <span>· {sg.name}</span>
              </span>
            );
          })}
        </div>
      )}

      {!creating ? (
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setError(null);
          }}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${
            isDark
              ? "bg-white/10 hover:bg-white/15 text-white border border-white/15"
              : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200"
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> novo subgrupo
        </button>
      ) : (
        <div
          className={`rounded-xl border p-3 space-y-2 ${
            isDark ? "border-white/10 bg-white/[0.03]" : "border-zinc-200 bg-zinc-50"
          }`}
        >
          <div className="flex flex-wrap gap-2 items-end">
            <div className="w-24">
              <label className={`block text-[11px] mb-1 ${labelCls}`}>
                Número *
              </label>
              <input
                value={num}
                onChange={(e) => setNum(e.target.value)}
                placeholder="1.4"
                className={`w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none ${inputCls}`}
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className={`block text-[11px] mb-1 ${labelCls}`}>
                Nome do subgrupo *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Terrário, Coleira de Cachorro"
                className={`w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none ${inputCls}`}
              />
            </div>
          </div>

          <p className={`text-[11px] ${labelCls}`}>
            O número antes do ponto indica o MACRO (criado na página inicial). Ex.:
            “1.4” = macro Nº 1, subgrupo 4. Macros disponíveis:{" "}
            {macroNumbers.length > 0
              ? macroNumbers
                  .slice()
                  .sort((a, b) => a - b)
                  .map((n) => `${n}${macroNameByNumber.get(n) ? ` (${macroNameByNumber.get(n)})` : ""}`)
                  .join(", ")
              : "nenhum macro criado ainda"}
            .
          </p>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleCreate}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${
                isDark
                  ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              } disabled:opacity-60`}
            >
              {saving ? "Criando…" : "Criar subgrupo"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError(null);
                setNum("");
                setName("");
              }}
              className={`text-xs px-3 py-1.5 rounded-lg ${
                isDark ? "text-white/60 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {selectedId && (
        <p className={`text-[11px] ${labelCls}`}>
          Selecionado:{" "}
          <span className="font-semibold">
            {(() => {
              const sg = subgroups.find((s) => s.id === selectedId);
              return sg ? formatSubgroupLabel(sg.macroNumber, sg.sub, sg.name) : "—";
            })()}
          </span>
        </p>
      )}
    </div>
  );
}
