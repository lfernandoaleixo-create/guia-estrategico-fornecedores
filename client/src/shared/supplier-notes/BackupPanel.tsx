import { useRef, useState } from "react";
import {
  exportAllNotes,
  downloadBackup,
  readBackupFile,
  importAllNotes,
  type ImportResult,
} from "./backup";

/**
 * BackupPanel — UI compartilhada para Backup/Restore das anotações.
 *
 * Os dados (status, observações, campos, anexos, grupos e fornecedores) ficam
 * salvos no banco de dados compartilhado e sincronizam automaticamente entre
 * todos os dispositivos e navegadores. Este painel permite exportar/importar
 * um arquivo JSON como camada extra de segurança (e para mover dados entre
 * ambientes), mas não é mais necessário para evitar perda local.
 */
export function BackupPanel({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isDark = tone === "dark";
  const cardBg = isDark ? "bg-white/5 border-white/10" : "bg-white border-zinc-200";
  const textMain = isDark ? "text-white" : "text-zinc-900";
  const textMuted = isDark ? "text-white/60" : "text-zinc-600";
  const buttonPrimary = isDark
    ? "bg-amber-500 hover:bg-amber-400 text-zinc-950"
    : "bg-zinc-900 hover:bg-zinc-800 text-white";
  const buttonSecondary = isDark
    ? "bg-white/10 hover:bg-white/15 text-white border border-white/15"
    : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200";

  async function handleExport() {
    setError(null);
    setInfo(null);
    setExporting(true);
    try {
      const backup = await exportAllNotes();
      downloadBackup(backup);
      setInfo(
        `Backup gerado: ${backup.totalEntries} anotações e ${backup.totalAttachments} anexos salvos no arquivo.`
      );
    } catch (e) {
      setError(`Falha ao exportar: ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(file: File) {
    setError(null);
    setInfo(null);
    setImporting(true);
    try {
      const json = await readBackupFile(file);
      const result = await importAllNotes(json);
      setLastImport(result);
      setInfo(
        `Importação concluída. Adicionadas: ${result.total} alterações. Recarregue a página para ver os dados.`
      );
    } catch (e) {
      setError(`Falha ao importar: ${(e as Error).message}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div
      className={`rounded-2xl border ${cardBg} p-4 sm:p-5 flex flex-col gap-3`}
      role="region"
      aria-label="Backup das anotações"
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">💾</span>
            <h3 className={`text-sm font-semibold tracking-wide ${textMain}`}>
              Backup das anotações
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/40 font-medium">
              Sincronizado na nuvem
            </span>
          </div>
          <p className={`text-xs leading-relaxed ${textMuted}`}>
            Status, observações, campos e anexos ficam salvos no <strong>banco de dados
            compartilhado</strong> — sincronizam automaticamente entre todos os dispositivos e
            navegadores. Ainda assim, você pode <strong>exportar um backup periódico</strong> em
            arquivo JSON (e restaurá-lo a qualquer momento) como camada extra de segurança.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`text-xs font-semibold px-3 py-2 rounded-lg ${buttonPrimary} disabled:opacity-60`}
            type="button"
          >
            {exporting ? "Gerando…" : "⬇ Exportar backup (.json)"}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className={`text-xs font-medium px-3 py-2 rounded-lg ${buttonSecondary} disabled:opacity-60`}
            type="button"
          >
            {importing ? "Importando…" : "⬆ Restaurar backup"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
            }}
          />
        </div>
      </div>
      {(info || error || lastImport) && (
        <div className="text-xs space-y-1 mt-1">
          {info && (
            <p className={isDark ? "text-emerald-300" : "text-emerald-700"}>{info}</p>
          )}
          {error && <p className={isDark ? "text-rose-300" : "text-rose-700"}>{error}</p>}
          {lastImport && (
            <p className={textMuted}>
              Aquário: +{lastImport.added.aquario} novas / {lastImport.updated.aquario}{" "}
              atualizadas · Tapete: +{lastImport.added.tapete} / {lastImport.updated.tapete} ·
              Yiwu: +{lastImport.added.yiwu} / {lastImport.updated.yiwu}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
