import { useState } from "react";
import {
  GROUP_COLOR_PALETTE,
  useSupplierGroups,
} from "./useSupplierGroups";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** "dark" para Yiwu; "light" para Aquário/Tapete. */
  tone?: "light" | "dark";
}

/**
 * Componente compacto para marcar quais grupos um fornecedor pertence.
 * Aparece dentro do SupplierNotesPanel, logo abaixo do Status.
 * Permite criar um grupo novo na hora (modal rápido) sem sair do painel.
 */
export function GroupPicker({ selectedIds, onChange, tone = "light" }: Props) {
  const { groups, createGroup } = useSupplierGroups();
  const isDark = tone === "dark";
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLegend, setNewLegend] = useState("");
  const [newColor, setNewColor] = useState(GROUP_COLOR_PALETTE[0]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const created = await createGroup({ name: newName, legend: newLegend, color: newColor });
    if (created) {
      onChange([...selectedIds, created.id]);
    }
    setNewName("");
    setNewLegend("");
    setNewColor(GROUP_COLOR_PALETTE[0]);
    setAdding(false);
  }

  const labelColor = isDark ? "#cbd5e1" : "#52525b";
  const hintColor = isDark ? "#94a3b8" : "#71717a";

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: labelColor, marginBottom: 8 }}>
        Grupos do Fornecedor
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {groups.length === 0 && (
          <div style={{ fontSize: 13, color: hintColor, fontStyle: "italic" }}>
            Selecione um grupo abaixo para classificar este fornecedor, ou clique em &quot;+ novo grupo&quot; para criar uma categoria.
          </div>
        )}
        {groups.map((g) => {
          const active = selectedIds.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g.id)}
              title={g.legend || g.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                border: `2px solid ${g.color}`,
                background: active ? g.color : "transparent",
                color: active ? "#ffffff" : isDark ? "#f1f5f9" : "#1f2937",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "background 160ms cubic-bezier(0.23, 1, 0.32, 1)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: active ? "#ffffff" : g.color,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  background: active ? "rgba(255,255,255,0.22)" : `${g.color}33`,
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                Nº {String(g.number ?? 0).padStart(2, "0")}
              </span>
              {g.name}
              {active && <span aria-hidden>✓</span>}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: `1px dashed ${isDark ? "#475569" : "#cbd5e1"}`,
            background: "transparent",
            color: isDark ? "#cbd5e1" : "#475569",
            fontSize: 13,
            cursor: "pointer",
          }}
          title="Criar novo grupo"
        >
          + novo grupo
        </button>
      </div>

      {adding && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 10,
            border: `1px dashed ${isDark ? "#475569" : "#cbd5e1"}`,
            background: isDark ? "rgba(15,23,42,0.4)" : "#f8fafc",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do grupo (ex.: Brinquedos)"
              style={{
                flex: "1 1 220px",
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${isDark ? "#475569" : "#d1d5db"}`,
                background: isDark ? "rgba(15,23,42,0.7)" : "#fff",
                color: isDark ? "#f1f5f9" : "#0f172a",
                fontSize: 13,
              }}
            />
            <input
              value={newLegend}
              onChange={(e) => setNewLegend(e.target.value)}
              placeholder="Legenda (opcional)"
              style={{
                flex: "1 1 220px",
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${isDark ? "#475569" : "#d1d5db"}`,
                background: isDark ? "rgba(15,23,42,0.7)" : "#fff",
                color: isDark ? "#f1f5f9" : "#0f172a",
                fontSize: 13,
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: labelColor, fontWeight: 600 }}>Cor:</span>
            {GROUP_COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: c,
                  border: newColor === c ? "3px solid #0f172a" : "2px solid #e5e7eb",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => setAdding(false)}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${isDark ? "#475569" : "#d1d5db"}`, background: "transparent", color: isDark ? "#f1f5f9" : "#0f172a", cursor: "pointer", fontSize: 13 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim()}
              style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: newName.trim() ? "#0f172a" : "#94a3b8", color: "#fff", cursor: newName.trim() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600 }}
            >
              Criar e marcar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
