import { useMemo, useState } from "react";
import { useSubgroups, SUBGROUP_PALETTE, type Subgroup } from "./useSubgroups";
import { useMacros } from "./useMacros";
import {
  validateSubgroupNumber,
  subgroupErrorMessage,
  formatSubgroupNumber,
  nextSubForMacro,
} from "./subgroupNumber";

interface Props {
  /** "dark" para dashboard escuro (Yiwu); "light" para Aquário/Tapete. */
  tone?: "light" | "dark";
}

/**
 * Componente "Subgrupos" — disponível dentro de cada página de anotações.
 *
 * Substitui o antigo gestor de "grupos" (entidade supplier_groups). Agora opera
 * diretamente sobre os SUBGRUPOS no modelo macro.sub (ex.: 1.1, 1.2, 2.1), que
 * são amarrados a um MACRO criado na página inicial (Classificações). A criação
 * é bloqueada se o macro digitado não existir.
 *
 * Os subgrupos são compartilhados pelos dashboards e podem ser vinculados a cada
 * fornecedor (fields.subgroupId), aparecendo como selo no card recolhido.
 */
export function GroupsManager({ tone = "light" }: Props) {
  const { subgroups, createSubgroup, updateSubgroup, deleteSubgroup } = useSubgroups();
  const { macros } = useMacros();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [numberRaw, setNumberRaw] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBGROUP_PALETTE[0]);

  const isDark = tone === "dark";

  const existingMacroNumbers = useMemo(
    () => macros.map((m) => m.number).filter((n) => Number.isFinite(n)),
    [macros],
  );
  const macroNameByNumber = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of macros) map.set(m.number, m.name);
    return map;
  }, [macros]);

  // Validação ao vivo do número digitado.
  const validation = useMemo(
    () =>
      validateSubgroupNumber({
        raw: numberRaw,
        existingMacroNumbers,
        existingSubgroups: subgroups.map((s) => ({
          macroNumber: s.macroNumber,
          sub: s.sub,
          id: s.id,
        })),
        editingId: editing,
      }),
    [numberRaw, existingMacroNumbers, subgroups, editing],
  );

  const errorMsg =
    numberRaw.trim() && !validation.ok
      ? subgroupErrorMessage(validation.error, validation.parsed?.macroNumber)
      : "";

  const canSave = validation.ok && !!name.trim();

  const containerStyle: React.CSSProperties = {
    background: isDark ? "rgba(15,23,42,0.55)" : "#ffffff",
    border: `1px solid ${isDark ? "rgba(148,163,184,0.25)" : "#e5e7eb"}`,
    borderRadius: 12,
    padding: 16,
    color: isDark ? "#f1f5f9" : "#0f172a",
  };

  function suggestNextNumber(): string {
    // Sugere "macro.prox" para o primeiro macro existente (se houver).
    const firstMacro = existingMacroNumbers[0];
    if (firstMacro == null) return "";
    const sub = nextSubForMacro(
      firstMacro,
      subgroups.map((s) => ({ macroNumber: s.macroNumber, sub: s.sub })),
    );
    return formatSubgroupNumber(firstMacro, sub);
  }

  function startCreate() {
    setEditing(null);
    setNumberRaw(suggestNextNumber());
    setName("");
    setColor(SUBGROUP_PALETTE[subgroups.length % SUBGROUP_PALETTE.length] ?? SUBGROUP_PALETTE[0]);
    setOpen(true);
  }

  function startEdit(sg: Subgroup) {
    setEditing(sg.id);
    setNumberRaw(formatSubgroupNumber(sg.macroNumber, sg.sub));
    setName(sg.name);
    setColor(sg.color);
    setOpen(true);
  }

  async function handleSave() {
    if (!canSave || !validation.parsed) return;
    const { macroNumber, sub } = validation.parsed;
    if (editing) {
      await updateSubgroup(editing, { macroNumber, sub, name, color });
    } else {
      await createSubgroup({ macroNumber, sub, name, color });
    }
    setOpen(false);
  }

  async function handleDelete(sg: Subgroup) {
    if (
      window.confirm(
        `Excluir o subgrupo ${formatSubgroupNumber(sg.macroNumber, sg.sub)} - ${sg.name}? Os fornecedores marcados com ele NÃO serão apagados, apenas perderão o vínculo.`,
      )
    ) {
      await deleteSubgroup(sg.id);
    }
  }

  const hasMacros = existingMacroNumbers.length > 0;
  const macrosHint =
    existingMacroNumbers
      .map((n) => `${n}${macroNameByNumber.get(n) ? ` (${macroNameByNumber.get(n)})` : ""}`)
      .join(" · ") || "nenhum";

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7 }}>
            Subgrupos
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            Crie subgrupos numerados no formato <strong>macro.sub</strong> (ex.: 1.1, 1.2, 2.1).
            Cada subgrupo pertence a um <strong>MACRO</strong> criado na página inicial (Classificações).
            Depois, vincule cada fornecedor a um subgrupo — o número aparece no card.
          </div>
        </div>
        <button
          type="button"
          onClick={startCreate}
          style={{
            background: "#f97316",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Novo subgrupo
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {subgroups.length === 0 && (
          <div style={{ fontSize: 13, opacity: 0.65, fontStyle: "italic" }}>
            Nenhum subgrupo criado ainda. Clique em &quot;+ Novo subgrupo&quot; para começar.
          </div>
        )}
        {subgroups.map((sg) => (
          <div
            key={sg.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              border: `2px solid ${sg.color}`,
              background: `${sg.color}1a`, // 10% alpha
              color: isDark ? "#f1f5f9" : "#1f2937",
              fontWeight: 600,
              fontSize: 13,
            }}
            title={`${formatSubgroupNumber(sg.macroNumber, sg.sub)} - ${sg.name}`}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: sg.color,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 800,
                opacity: 0.95,
                background: `${sg.color}33`,
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              {formatSubgroupNumber(sg.macroNumber, sg.sub)}
            </span>
            <span>{sg.name}</span>
            <button
              type="button"
              onClick={() => startEdit(sg)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: 12, opacity: 0.7 }}
              title="Editar subgrupo"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={() => handleDelete(sg)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 12 }}
              title="Excluir subgrupo"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              color: "#0f172a",
              borderRadius: 12,
              padding: 20,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              {editing ? "Editar subgrupo" : "Novo subgrupo"}
            </h3>
            <p style={{ margin: "4px 0 16px", fontSize: 13, opacity: 0.7 }}>
              O subgrupo pertence a um MACRO existente. Os subgrupos são compartilhados entre os dashboards.
            </p>

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>
              Número (macro.sub)
            </label>
            <input
              autoFocus
              value={numberRaw}
              onChange={(e) => setNumberRaw(e.target.value)}
              placeholder="Ex.: 1.3"
              inputMode="decimal"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${errorMsg ? "#dc2626" : "#d1d5db"}`,
                borderRadius: 8,
                marginTop: 4,
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "'Fraunces', serif",
              }}
            />
            <span style={{ fontSize: 10, opacity: 0.6, marginTop: 4, display: "block" }}>
              Macros disponíveis: {macrosHint}
            </span>
            {!hasMacros && (
              <span style={{ fontSize: 11, color: "#b45309", marginTop: 4, display: "block" }}>
                Nenhum macro criado ainda. Crie um macro na página inicial (Classificações) antes de adicionar subgrupos.
              </span>
            )}
            {errorMsg && (
              <span style={{ fontSize: 11, color: "#dc2626", marginTop: 4, display: "block" }}>
                {errorMsg}
              </span>
            )}

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7, marginTop: 12 }}>
              Nome do subgrupo
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Terrário, Aquário, Marmita…"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, marginTop: 4, fontSize: 14 }}
            />

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7, marginTop: 12 }}>
              Cor
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {SUBGROUP_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Cor ${c}`}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: c,
                    border: color === c ? "3px solid #0f172a" : "2px solid #e5e7eb",
                    cursor: "pointer",
                  }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 28, height: 28, border: "none", padding: 0, cursor: "pointer", background: "transparent" }}
                title="Cor personalizada"
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 500 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: canSave ? "#0f172a" : "#94a3b8",
                  color: "#fff",
                  cursor: canSave ? "pointer" : "not-allowed",
                  fontWeight: 600,
                }}
              >
                {editing ? "Salvar alterações" : "Criar subgrupo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
