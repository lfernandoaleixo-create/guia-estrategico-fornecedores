// =============================================================================
// MacroManager — modal de gestão das classificações MACRO (na Home).
//
// Permite:
//  - Criar um macro (número + nome + cor)
//  - Editar nome/número/cor
//  - Atribuir itens do catálogo (dashboards/subgrupos/grupos) a um macro
//  - Reordenar os itens (↑/↓) — a ordem define a numeração 1.1, 1.2, 1.3…
//  - Remover item do macro (não exclui o dashboard, só desfaz o vínculo)
//  - Excluir o macro
//
// NÃO altera nenhum dado de fornecedores/anexos/especialidades — apenas a
// tabela `macros` (camada aditiva).
// =============================================================================
import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  FolderTree,
  GripVertical,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMacros, MACRO_PALETTE, type MacroItem } from "./useMacros";
import { buildCatalog } from "./macroCatalog";

interface MacroManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotedGroups: { id: string; name: string; number: number }[];
}

export function MacroManager({ open, onOpenChange, promotedGroups }: MacroManagerProps) {
  const {
    macros,
    itemAssignment,
    createMacro,
    updateMacro,
    deleteMacro,
    assignItem,
    removeItem,
    reorderItems,
  } = useMacros();

  const catalog = useMemo(() => buildCatalog(promotedGroups), [promotedGroups]);

  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newColor, setNewColor] = useState(MACRO_PALETTE[0]);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const trimmedNumber = newNumber.trim();
      const num = parseInt(trimmedNumber, 10);
      const created = await createMacro({
        name: newName,
        // Campo vazio = automático; valor digitado (inclusive 0) é respeitado.
        number: trimmedNumber !== "" && Number.isFinite(num) && num >= 0 ? num : undefined,
        color: newColor,
      });
      setNewName("");
      setNewNumber("");
      setNewColor(MACRO_PALETTE[macros.length % MACRO_PALETTE.length]);
      if (created) setExpandedId(created.id);
    } finally {
      setCreating(false);
    }
  };

  const moveItem = async (macroId: string, keys: string[], idx: number, dir: -1 | 1) => {
    const next = [...keys];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    await reorderItems(macroId, next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[88vh] overflow-y-auto border"
        style={{ background: "oklch(0.10 0.02 250)", borderColor: "oklch(0.24 0.03 250)" }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            style={{ fontFamily: "'Fraunces', serif", color: "oklch(0.97 0.01 80)" }}
          >
            <FolderTree className="w-5 h-5" style={{ color: "oklch(0.78 0.16 300)" }} />
            Classificações MACRO
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm" style={{ color: "oklch(0.7 0.02 80)" }}>
          Organize seus dashboards em grandes categorias (ex.: <strong>1 · PET</strong>). Dentro de
          cada macro, a ordem dos itens define a numeração (1.1, 1.2, 1.3…). Um item pertence a
          apenas um macro.
        </p>

        {/* Criar novo macro */}
        <div
          className="rounded-xl p-4 border space-y-3"
          style={{ background: "oklch(0.08 0.018 250)", borderColor: "oklch(0.22 0.03 250)" }}
        >
          <div className="text-xs uppercase tracking-[0.16em] font-semibold" style={{ color: "oklch(0.6 0.02 80)" }}>
            Nova classificação
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Nº"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className="sm:w-20"
              style={{ background: "oklch(0.12 0.02 250)", borderColor: "oklch(0.26 0.03 250)", color: "oklch(0.95 0.01 80)" }}
            />
            <Input
              placeholder="Nome do macro (ex.: PET)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1"
              style={{ background: "oklch(0.12 0.02 250)", borderColor: "oklch(0.26 0.03 250)", color: "oklch(0.95 0.01 80)" }}
            />
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              style={{ background: newColor, color: "oklch(0.1 0.02 250)" }}
            >
              <Plus className="w-4 h-4 mr-1" /> Criar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MACRO_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-6 h-6 rounded-full transition-transform"
                style={{
                  background: c,
                  transform: newColor === c ? "scale(1.2)" : "scale(1)",
                  boxShadow: newColor === c ? `0 0 0 2px oklch(0.1 0.02 250), 0 0 0 4px ${c}` : "none",
                }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Lista de macros existentes */}
        <div className="space-y-3">
          {macros.length === 0 && (
            <div className="text-center text-sm py-6" style={{ color: "oklch(0.55 0.02 80)" }}>
              Nenhuma classificação ainda. Crie a primeira acima (ex.: <strong>1 · PET</strong>).
            </div>
          )}

          {macros.map((m) => {
            const isExpanded = expandedId === m.id;
            const itemKeys = m.items.map((it) => it.key);
            const availableToAdd = catalog.filter(
              (c) => !itemAssignment.has(c.key) || itemAssignment.get(c.key) === m.id,
            ).filter((c) => !itemKeys.includes(c.key));

            return (
              <div
                key={m.id}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "oklch(0.24 0.03 250)", background: "oklch(0.08 0.018 250)" }}
              >
                {/* Cabeçalho do macro */}
                <div className="flex items-center gap-3 p-3">
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-bold flex-shrink-0"
                    style={{ background: `${m.color}22`, border: `1px solid ${m.color}88`, color: m.color, fontFamily: "'Fraunces', serif" }}
                  >
                    {m.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ color: "oklch(0.95 0.01 80)", fontFamily: "'Fraunces', serif" }}>
                      {m.name}
                    </div>
                    <div className="text-xs" style={{ color: "oklch(0.55 0.02 80)" }}>
                      {m.items.length} {m.items.length === 1 ? "item" : "itens"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    style={{ borderColor: "oklch(0.28 0.03 250)", color: "oklch(0.85 0.02 80)" }}
                  >
                    {isExpanded ? "Fechar" : "Editar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Excluir a classificação "${m.name}"? Os dashboards NÃO são apagados, apenas o agrupamento.`)) {
                        deleteMacro(m.id);
                        if (expandedId === m.id) setExpandedId(null);
                      }
                    }}
                    style={{ borderColor: "oklch(0.4 0.12 25)", color: "oklch(0.7 0.16 25)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Corpo expandido: editar nome/cor, itens e ordenação */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-4 border-t pt-3" style={{ borderColor: "oklch(0.2 0.03 250)" }}>
                    {/* Editar nome/número/cor */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={m.number}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (Number.isFinite(n) && n >= 0) updateMacro(m.id, { number: n });
                        }}
                        className="sm:w-20"
                        style={{ background: "oklch(0.12 0.02 250)", borderColor: "oklch(0.26 0.03 250)", color: "oklch(0.95 0.01 80)" }}
                      />
                      <Input
                        value={m.name}
                        onChange={(e) => updateMacro(m.id, { name: e.target.value })}
                        className="flex-1"
                        style={{ background: "oklch(0.12 0.02 250)", borderColor: "oklch(0.26 0.03 250)", color: "oklch(0.95 0.01 80)" }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {MACRO_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => updateMacro(m.id, { color: c })}
                          className="w-5 h-5 rounded-full"
                          style={{
                            background: c,
                            transform: m.color === c ? "scale(1.25)" : "scale(1)",
                            boxShadow: m.color === c ? `0 0 0 2px oklch(0.1 0.02 250), 0 0 0 4px ${c}` : "none",
                          }}
                          aria-label={`Cor ${c}`}
                        />
                      ))}
                    </div>

                    {/* Itens do macro (ordenáveis) */}
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: "oklch(0.6 0.02 80)" }}>
                        Itens (numeração na ordem)
                      </div>
                      {m.items.length === 0 && (
                        <div className="text-xs italic mb-2" style={{ color: "oklch(0.5 0.02 80)" }}>
                          Nenhum item ainda. Adicione abaixo.
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {m.items.map((it, idx) => (
                          <div
                            key={it.key}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                            style={{ background: "oklch(0.12 0.02 250)", border: "1px solid oklch(0.22 0.03 250)" }}
                          >
                            <GripVertical className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.4 0.02 80)" }} />
                            <span
                              className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{ background: `${m.color}22`, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {m.number}.{idx + 1}
                            </span>
                            <span className="text-sm flex-1 truncate" style={{ color: "oklch(0.92 0.01 80)" }}>
                              {it.label}
                            </span>
                            <button
                              onClick={() => moveItem(m.id, itemKeys, idx, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded disabled:opacity-30"
                              style={{ color: "oklch(0.7 0.02 80)" }}
                              aria-label="Mover para cima"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveItem(m.id, itemKeys, idx, 1)}
                              disabled={idx === m.items.length - 1}
                              className="p-1 rounded disabled:opacity-30"
                              style={{ color: "oklch(0.7 0.02 80)" }}
                              aria-label="Mover para baixo"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeItem(m.id, it.key)}
                              className="p-1 rounded"
                              style={{ color: "oklch(0.65 0.16 25)" }}
                              aria-label="Remover item"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Adicionar itens disponíveis */}
                    {availableToAdd.length > 0 && (
                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: "oklch(0.6 0.02 80)" }}>
                          Adicionar item
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {availableToAdd.map((c) => {
                            const assignedElsewhere = itemAssignment.has(c.key) && itemAssignment.get(c.key) !== m.id;
                            return (
                              <button
                                key={c.key}
                                onClick={() => assignItem(m.id, c)}
                                className="text-xs px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1 transition-colors"
                                style={{
                                  background: "oklch(0.12 0.02 250)",
                                  borderColor: "oklch(0.26 0.03 250)",
                                  color: "oklch(0.85 0.02 80)",
                                }}
                                title={assignedElsewhere ? "Está em outro macro — será movido para este" : undefined}
                              >
                                <Plus className="w-3 h-3" /> {c.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)} style={{ background: "oklch(0.78 0.16 300)", color: "oklch(0.1 0.02 250)" }}>
            <Check className="w-4 h-4 mr-1" /> Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
