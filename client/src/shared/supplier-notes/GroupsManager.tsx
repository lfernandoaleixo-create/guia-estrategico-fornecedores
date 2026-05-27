import { useState } from "react";
import {
  GROUP_COLOR_PALETTE,
  type SupplierGroup,
  useSupplierGroups,
} from "./useSupplierGroups";

interface Props {
  /** "dark" para dashboard escuro (Yiwu); "light" para Aquário/Tapete. */
  tone?: "light" | "dark";
}

/**
 * Componente "Gerenciar Grupos" — disponível dentro de cada página de anotações.
 * Permite criar / editar / excluir grupos compartilhados pelos 3 dashboards.
 * Os grupos podem depois ser marcados em cada fornecedor via SupplierNotesPanel.
 */
export function GroupsManager({ tone = "light" }: Props) {
  const { groups, createGroup, updateGroup, deleteGroup } = useSupplierGroups();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; legend: string; color: string }>(
    { name: "", legend: "", color: GROUP_COLOR_PALETTE[0] }
  );

  const isDark = tone === "dark";

  const containerStyle: React.CSSProperties = {
    background: isDark ? "rgba(15,23,42,0.55)" : "#ffffff",
    border: `1px solid ${isDark ? "rgba(148,163,184,0.25)" : "#e5e7eb"}`,
    borderRadius: 12,
    padding: 16,
    color: isDark ? "#f1f5f9" : "#0f172a",
  };

  function startCreate() {
    setEditing(null);
    setDraft({ name: "", legend: "", color: GROUP_COLOR_PALETTE[0] });
    setOpen(true);
  }

  function startEdit(g: SupplierGroup) {
    setEditing(g.id);
    setDraft({ name: g.name, legend: g.legend, color: g.color });
    setOpen(true);
  }

  async function handleSave() {
    if (!draft.name.trim()) return;
    if (editing) {
      await updateGroup(editing, draft);
    } else {
      await createGroup(draft);
    }
    setOpen(false);
  }

  async function handleDelete(id: string) {
    if (
      window.confirm(
        "Excluir este grupo? Os fornecedores marcados com ele NÃO serão apagados, apenas perderão o vínculo."
      )
    ) {
      await deleteGroup(id);
    }
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7 }}>
            Grupos de fornecedores
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            Crie categorias (ex.: Brinquedos, Aquário/Terrário, Tapete artesanal…) para organizar os fornecedores nos 3 dashboards. Cada anotação pode ser marcada com um ou mais grupos.
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
          + Novo grupo
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {groups.length === 0 && (
          <div style={{ fontSize: 13, opacity: 0.65, fontStyle: "italic" }}>
            Nenhum grupo criado ainda. Clique em &quot;+ Novo grupo&quot; para começar.
          </div>
        )}
        {groups.map((g) => (
          <div
            key={g.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              border: `2px solid ${g.color}`,
              background: `${g.color}1a`, // 10% alpha
              color: isDark ? "#f1f5f9" : "#1f2937",
              fontWeight: 600,
              fontSize: 13,
            }}
            title={g.legend || g.name}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: g.color,
                display: "inline-block",
              }}
            />
            <span>{g.name}</span>
            {g.legend && <span style={{ opacity: 0.7, fontWeight: 400 }}>· {g.legend}</span>}
            <button
              type="button"
              onClick={() => startEdit(g)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: 12, opacity: 0.7 }}
              title="Editar grupo"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={() => handleDelete(g.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 12 }}
              title="Excluir grupo"
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
              {editing ? "Editar grupo" : "Novo grupo"}
            </h3>
            <p style={{ margin: "4px 0 16px", fontSize: 13, opacity: 0.7 }}>
              Os grupos são compartilhados entre Aquário, Tapete e Yiwu.
            </p>

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>
              Nome do grupo
            </label>
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ex.: Brinquedos, Aquário/Terrário, Tapete artesanal…"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, marginTop: 4, fontSize: 14 }}
            />

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7, marginTop: 12 }}>
              Legenda / descrição
            </label>
            <textarea
              value={draft.legend}
              onChange={(e) => setDraft({ ...draft, legend: e.target.value })}
              placeholder="Descrição rápida do grupo (opcional). Ex.: Fornecedores de brinquedos infantis até 5 anos."
              rows={2}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, marginTop: 4, fontSize: 14, resize: "vertical" }}
            />

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7, marginTop: 12 }}>
              Cor
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {GROUP_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDraft({ ...draft, color: c })}
                  aria-label={`Cor ${c}`}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: c,
                    border: draft.color === c ? "3px solid #0f172a" : "2px solid #e5e7eb",
                    cursor: "pointer",
                  }}
                />
              ))}
              <input
                type="color"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
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
                disabled={!draft.name.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: draft.name.trim() ? "#0f172a" : "#94a3b8",
                  color: "#fff",
                  cursor: draft.name.trim() ? "pointer" : "not-allowed",
                  fontWeight: 600,
                }}
              >
                {editing ? "Salvar alterações" : "Criar grupo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
