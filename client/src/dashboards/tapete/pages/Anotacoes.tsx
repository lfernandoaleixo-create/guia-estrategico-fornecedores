/**
 * Página: Anotações / Diário de Negociação
 * Layout idêntico à página Fábricas Chinesas:
 *  - Mesmos filtros (busca, província, volume, contato, tipo)
 *  - Mesmo ranking numerado e badges
 *  - Mesmos cards expandíveis com dados de contato
 *  - Seção "Diário de Negociação" integrada dentro de cada card expandido
 *  - Dados persistidos no banco de dados em nuvem via tRPC
 */
import { useState, useMemo, useRef } from "react";
import Layout from "@tapete/components/Layout";
import { todosExportadores } from "@tapete/lib/data";
import { getClassificacao, tipoLabel, type TipoEmpresa } from "@tapete/lib/classificacao";
import { contatosFabricas } from "@tapete/lib/contatos";
import { trpc } from "@tapete/lib/trpc-stub";
import type { Negociacao, EntradaDiario } from "@tapete/lib/types";
import SupplierNotesPanel, { type PrefilledField } from "@/shared/supplier-notes/SupplierNotesPanel";
import { DEFAULT_EDITABLE_FIELDS } from "@/shared/supplier-notes/field-presets";
import { BackupPanel } from "@/shared/supplier-notes/BackupPanel";
import type { ContatoFabrica } from "@/dashboards/tapete/lib/contatos";
import {
  Search, Factory, ChevronDown, ChevronUp, ExternalLink, Award,
  Mail, Phone, MessageCircle, Globe, Copy, CheckCheck, MapPin,
  CheckCircle2, AlertCircle, Info, ShieldCheck, ShieldAlert,
  NotebookPen, PlusCircle, Trash2, Paperclip, FileText,
  Save, X, Loader2, Clock, Package, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ─── Config visual (idêntico ao Exportadores) ─────────────────────────────────

const relevanciaLabel: Record<string, { label: string; color: string }> = {
  top:   { label: "Top 5",        color: "bg-amber-100 text-amber-800 border-amber-200" },
  alto:  { label: "Alto Volume",  color: "bg-blue-100 text-blue-800 border-blue-200" },
  medio: { label: "Médio Volume", color: "bg-slate-100 text-slate-600 border-slate-200" },
  baixo: { label: "Baixo Volume", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

const provincias = [
  "Todas", "Shandong", "Zhejiang", "Jiangsu", "Tianjin",
  "Fujian", "Guangdong", "Shanghai", "Anhui", "Henan",
  "Liaoning", "Hebei", "Jiangxi", "Hong Kong",
];

// ─── Config do Diário ─────────────────────────────────────────────────────────

type StatusNeg =
  | "nao_iniciado" | "primeiro_contato" | "aguardando_resposta" | "em_negociacao"
  | "proposta_enviada" | "proposta_recebida" | "pedido_amostra" | "amostra_recebida"
  | "fechado" | "cancelado";

type Canal = "email" | "whatsapp" | "telefone" | "alibaba" | "reuniao" | "outro";

const STATUS_NEG: Record<StatusNeg, { label: string; color: string }> = {
  nao_iniciado:        { label: "Não Iniciado",        color: "bg-slate-100 text-slate-500 border-slate-200" },
  primeiro_contato:    { label: "Primeiro Contato",    color: "bg-slate-100 text-slate-700 border-slate-300" },
  aguardando_resposta: { label: "Aguardando Resposta", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  em_negociacao:       { label: "Em Negociação",       color: "bg-blue-100 text-blue-800 border-blue-300" },
  proposta_enviada:    { label: "Proposta Enviada",    color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  proposta_recebida:   { label: "Proposta Recebida",   color: "bg-violet-100 text-violet-800 border-violet-300" },
  pedido_amostra:      { label: "Pedido de Amostra",   color: "bg-orange-100 text-orange-800 border-orange-300" },
  amostra_recebida:    { label: "Amostra Recebida",    color: "bg-teal-100 text-teal-800 border-teal-300" },
  fechado:             { label: "Fechado",              color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  cancelado:           { label: "Cancelado",            color: "bg-red-100 text-red-700 border-red-300" },
};

const CANAIS: { value: Canal; label: string }[] = [
  { value: "email",    label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telefone", label: "Telefone" },
  { value: "alibaba",  label: "Alibaba" },
  { value: "reuniao",  label: "Reunião" },
  { value: "outro",    label: "Outro" },
];

interface AnexoLocal {
  id: string; nome: string; tipo: string; tamanho: number; dataBase64: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function fmtData(ts: number | Date) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function nivelContato(c: typeof contatosFabricas[0]): "completo" | "parcial" | "sem" {
  const pts =
    (c.email !== "Não encontrado" ? 2 : 0) +
    (c.telefone !== "Não encontrado" ? 1 : 0) +
    (c.alibabaUrl !== "Não encontrado" ? 1 : 0) +
    (c.site !== "Não encontrado" ? 1 : 0);
  if (pts >= 4) return "completo";
  if (pts >= 1) return "parcial";
  return "sem";
}

function findContato(nomeLogcomex: string) {
  const key = nomeLogcomex.replace(/ CHINA$/, "").replace(/ HK$/, "").trim();
  return contatosFabricas.find(c =>
    c.nomeInput === key ||
    key.startsWith(c.nomeInput) ||
    c.nomeInput.startsWith(key.split(" ").slice(0, 2).join(" "))
  ) || null;
}

// Mapeia tipo de classificação para categoria do banco
function tipoParaCategoria(tipo: TipoEmpresa): "fabrica" | "trader" | "materia_prima" {
  if (tipo === "FABRICANTE") return "fabrica";
  if (tipo === "TRADER") return "trader";
  return "materia_prima";
}

// ─── Sub-componente: seção de Diário dentro do card expandido ─────────────────

interface DiarioSectionProps {
  empresaId: string;
  nomeEmpresa: string;
  categoria: "fabrica" | "trader" | "materia_prima";
  neg: Negociacao | undefined;
  onNegUpdated: () => void;
  contato?: ContatoFabrica | null;
  tipoEmpresa?: TipoEmpresa;
}

function nonEmpty(v?: string | null): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (!t || /não encontrado/i.test(t)) return undefined;
  return t;
}

function buildTapetePrefilledFields(
  nomeFallback: string,
  c?: ContatoFabrica | null,
  tipo?: TipoEmpresa,
): PrefilledField[] {
  const fields: PrefilledField[] = [];
  const nomeOficial = c?.nomeOficial || nomeFallback;
  fields.push({ label: "Empresa", value: nomeOficial, copyable: true });
  if (tipo) fields.push({ label: "Classificação", value: tipo });
  if (c) {
    const cidade = nonEmpty(c.cidade);
    const prov = nonEmpty(c.provincia);
    if (cidade || prov) {
      fields.push({ label: "Cidade / Província", value: [cidade, prov].filter(Boolean).join(", ") });
    }
    const email = nonEmpty(c.email);
    if (email) fields.push({ label: "E-mail", value: email, copyable: true, href: `mailto:${email}` });
    const tel = nonEmpty(c.telefone);
    if (tel) fields.push({ label: "Telefone", value: tel, copyable: true, href: `tel:${tel.replace(/\s/g, "")}` });
    const wa = nonEmpty(c.whatsapp);
    if (wa) fields.push({ label: "WhatsApp", value: wa, copyable: true });
    const site = nonEmpty(c.site);
    if (site) fields.push({ label: "Site", value: site, href: site, full: true });
    const aliba = nonEmpty(c.alibabaUrl);
    if (aliba) fields.push({ label: "Alibaba", value: aliba, href: aliba, full: true });
    const produto = nonEmpty(c.produtoPrincipal);
    if (produto) fields.push({ label: "Produto principal", value: produto, full: true });
    const moq = nonEmpty(c.moq);
    if (moq) fields.push({ label: "MOQ registrado", value: moq });
    const preco = nonEmpty(c.precoFob);
    if (preco) fields.push({ label: "Preço FOB", value: preco });
    const cert = nonEmpty(c.certificacoes);
    if (cert) fields.push({ label: "Certificações", value: cert, full: true });
    const anos = nonEmpty(c.anosExperiencia);
    if (anos) fields.push({ label: "Experiência", value: anos });
    const obs = nonEmpty(c.observacao);
    if (obs) fields.push({ label: "Observação do cadastro", value: obs, full: true });
  } else {
    fields.push({
      label: "Cadastro",
      value: "Sem contatos no banco local. Busque no Alibaba ou Made-in-China.",
      full: true,
    });
  }
  return fields;
}

function DiarioSection({
  empresaId,
  nomeEmpresa,
  categoria,
  neg,
  onNegUpdated,
  contato,
  tipoEmpresa,
}: DiarioSectionProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unused = { categoria, neg, onNegUpdated };
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <SupplierNotesPanel
        scope="tapete"
        supplierId={empresaId}
        supplierName={nomeEmpresa}
        accent="#dc2626"
        prefilledFields={buildTapetePrefilledFields(nomeEmpresa, contato, tipoEmpresa)}
        editableFields={DEFAULT_EDITABLE_FIELDS}
      />
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
// Implementação legada (desativada) — mantida apenas para referência
function DiarioSectionLegacy({ empresaId, nomeEmpresa, categoria, neg, onNegUpdated }: DiarioSectionProps) {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    hora: new Date().toTimeString().slice(0, 5),
    texto: "",
    canal: "email" as Canal,
    status: "primeiro_contato" as StatusNeg,
    prioridade: "media" as "alta" | "media" | "baixa",
    autor: "",
    anexos: [] as AnexoLocal[],
  });

  const { data: entradas, isLoading: loadingEntradas } = trpc.diario.listarEntradas.useQuery(
    { negociacaoId: neg?.id ?? 0 },
    { enabled: !!neg }
  );

  const salvarNegMutation = trpc.diario.salvarNegociacao.useMutation();
  const criarEntradaMutation = trpc.diario.criarEntrada.useMutation();
  const uploadAnexoMutation = trpc.diario.uploadAnexo.useMutation();
  const deletarMutation = trpc.diario.deletarEntrada.useMutation({
    onSuccess: () => {
      utils.diario.listarEntradas.invalidate({ negociacaoId: neg?.id ?? 0 });
      utils.diario.listarNegociacoes.invalidate();
      onNegUpdated();
      toast.success("Anotação excluída.");
    },
    onError: () => toast.error("Erro ao excluir."),
  });

  function handleAnexo(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).forEach(file => {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} excede 5 MB.`); return; }
      const reader = new FileReader();
      reader.onload = ev => setForm(p => ({
        ...p,
        anexos: [...p.anexos, { id: uid(), nome: file.name, tipo: file.type, tamanho: file.size, dataBase64: ev.target?.result as string }],
      }));
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  async function salvar() {
    if (!form.texto.trim()) { toast.error("Escreva o conteúdo da anotação."); return; }
    setSalvando(true);
    try {
      const result = await salvarNegMutation.mutateAsync({
        empresaId,
        categoria,
        nomeEmpresa,
        status: form.status,
        prioridade: form.prioridade,
      });
      const negociacaoId = result.id;

      const anexosSalvos: { nome: string; url: string; key: string }[] = [];
      for (const anx of form.anexos) {
        const base64 = anx.dataBase64.split(",")[1] ?? anx.dataBase64;
        const uploaded = await uploadAnexoMutation.mutateAsync({
          fileName: anx.nome, mimeType: anx.tipo, base64, empresaId,
        });
        anexosSalvos.push({ nome: uploaded.nome, url: uploaded.url, key: uploaded.key });
      }

      const dataEntrada = new Date(`${form.data}T${form.hora}:00`).getTime();
      await criarEntradaMutation.mutateAsync({
        negociacaoId,
        funcionario: form.autor,
        canal: form.canal,
        anotacao: form.texto,
        statusEntrada: form.status,
        prioridadeEntrada: form.prioridade,
        anexos: anexosSalvos.length > 0 ? JSON.stringify(anexosSalvos) : undefined,
        dataEntrada,
      });

      await utils.diario.listarNegociacoes.invalidate();
      await utils.diario.listarEntradas.invalidate({ negociacaoId });
      onNegUpdated();

      setForm(p => ({ ...p, texto: "", autor: "", anexos: [] }));
      setShowForm(false);
      toast.success("Anotação salva!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const negStatus = neg ? STATUS_NEG[neg.status as StatusNeg] : null;

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      {/* Cabeçalho do Diário */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Diário de Negociação</span>
          {negStatus && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${negStatus.color}`}>
              {negStatus.label}
            </span>
          )}
          {neg && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              neg.prioridade === "alta" ? "bg-red-100 text-red-700 border-red-300" :
              neg.prioridade === "media" ? "bg-amber-100 text-amber-700 border-amber-300" :
              "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              {neg.prioridade === "alta" ? "🔴" : neg.prioridade === "media" ? "🟡" : "⚪"} {neg.prioridade === "alta" ? "Alta" : neg.prioridade === "media" ? "Média" : "Baixa"}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          {showForm ? "Cancelar" : "Nova Anotação"}
        </button>
      </div>

      {/* Formulário de nova anotação */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Data</label>
              <input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Hora</label>
              <input type="time" value={form.hora} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Canal</label>
              <select value={form.canal} onChange={e => setForm(p => ({ ...p, canal: e.target.value as Canal }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                {CANAIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Funcionário</label>
              <input type="text" placeholder="Seu nome..." value={form.autor} onChange={e => setForm(p => ({ ...p, autor: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Status da Negociação</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as StatusNeg }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                {(Object.keys(STATUS_NEG) as StatusNeg[]).map(s => (
                  <option key={s} value={s}>{STATUS_NEG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Prioridade</label>
              <select value={form.prioridade} onChange={e => setForm(p => ({ ...p, prioridade: e.target.value as "alta" | "media" | "baixa" }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                <option value="alta">🔴 Alta</option>
                <option value="media">🟡 Média</option>
                <option value="baixa">⚪ Baixa</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Anotação *</label>
            <textarea rows={4}
              placeholder="Descreva o que aconteceu: o que foi discutido, condições negociadas, próximos passos..."
              value={form.texto} onChange={e => setForm(p => ({ ...p, texto: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
          </div>
          <div className="mb-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Anexos (máx. 5 MB)</label>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleAnexo} />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors w-full justify-center">
              <Paperclip className="w-4 h-4" /> Clique para anexar arquivos
            </button>
            {form.anexos.length > 0 && (
              <div className="mt-2 space-y-1">
                {form.anexos.map(anx => (
                  <div key={anx.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-700 truncate flex-1">{anx.nome}</span>
                    <span className="text-xs text-slate-400">{fmtBytes(anx.tamanho)}</span>
                    <button onClick={() => setForm(p => ({ ...p, anexos: p.anexos.filter(a => a.id !== anx.id) }))} className="text-slate-300 hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} disabled={salvando} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancelar</button>
            <button onClick={salvar} disabled={salvando}
              className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-60">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {salvando ? "Salvando..." : "Salvar Anotação"}
            </button>
          </div>
        </div>
      )}

      {/* Histórico de entradas */}
      {loadingEntradas ? (
        <div className="py-6 text-center">
          <Loader2 className="w-5 h-5 text-slate-300 mx-auto mb-1 animate-spin" />
          <p className="text-xs text-slate-400">Carregando anotações...</p>
        </div>
      ) : !entradas || entradas.length === 0 ? (
        <div className="py-6 text-center">
          <NotebookPen className="w-7 h-7 text-slate-200 mx-auto mb-1" />
          <p className="text-xs text-slate-400">Nenhuma anotação ainda.</p>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="mt-1 text-xs text-red-600 hover:text-red-700 font-medium">
              + Adicionar primeira anotação
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {entradas.map((ent: EntradaDiario) => {
            const st = STATUS_NEG[(ent.statusEntrada as StatusNeg) ?? "nao_iniciado"] ?? STATUS_NEG.nao_iniciado;
            let anexos: { nome: string; url: string; key: string }[] = [];
            try { if (ent.anexos) anexos = JSON.parse(ent.anexos); } catch { /* ignore */ }
            const canalLabel = CANAIS.find(c => c.value === ent.canal)?.label ?? ent.canal;

            return (
              <div key={ent.id} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-700">
                      {fmtData(ent.dataEntrada)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>{st.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">{canalLabel}</span>
                    {ent.funcionario && <span className="text-xs text-slate-400">por {ent.funcionario}</span>}
                  </div>
                  <button
                    onClick={() => { if (confirm("Excluir esta anotação?")) deletarMutation.mutate({ id: ent.id }); }}
                    disabled={deletarMutation.isPending}
                    className="p-1 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{ent.anotacao}</p>
                {anexos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {anexos.map((anx, i) => (
                      <a key={i} href={anx.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 hover:bg-slate-100 transition-colors">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[140px]">{anx.nome}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Anotacoes() {
  const [search, setSearch] = useState("");
  const [provincia, setProvincia] = useState("Todas");
  const [relevancia, setRelevancia] = useState("Todas");
  const [filtroContato, setFiltroContato] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoEmpresa>("todos");
  const [filtroNeg, setFiltroNeg] = useState("todos"); // todos | com_neg | sem_neg
  const [activeCategory, setActiveCategory] = useState<TipoEmpresa | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Carregar negociações do banco
  const { data: negociacoesList, refetch } = trpc.diario.listarNegociacoes.useQuery();
  const negsMap = useMemo<Record<string, Negociacao>>(() => {
    if (!negociacoesList) return {};
    return Object.fromEntries(negociacoesList.map((n: Negociacao) => [n.empresaId, n]));
  }, [negociacoesList]);

  const fabricasComContato = useMemo(() =>
    todosExportadores
      .filter(e => e.pais === "China" || e.pais === "Hong Kong")
      .map(e => ({ ...e, contato: findContato(e.nome), classificacao: getClassificacao(e.nome) })),
  []);

  const filtered = useMemo(() => {
    return fabricasComContato.filter(e => {
      const matchSearch =
        e.nome.toLowerCase().includes(search.toLowerCase()) ||
        e.provincia.toLowerCase().includes(search.toLowerCase()) ||
        (e.contato?.nomeOficial || "").toLowerCase().includes(search.toLowerCase());
      const matchProv = provincia === "Todas" || e.provincia === provincia;
      const matchRel  = relevancia === "Todas" || e.relevancia === relevancia;
      const nivel = e.contato ? nivelContato(e.contato) : "sem";
      const matchContato =
        filtroContato === "todos" ||
        (filtroContato === "com_email"   && e.contato?.email !== "Não encontrado") ||
        (filtroContato === "com_alibaba" && e.contato?.alibabaUrl !== "Não encontrado") ||
        (filtroContato === "sem_contato" && nivel === "sem");
      const matchTipo =
        filtroTipo === "todos" || (e.classificacao?.tipo === filtroTipo);
      const temNeg = !!negsMap[e.nome];
      const matchNeg =
        filtroNeg === "todos" ||
        (filtroNeg === "com_neg" && temNeg) ||
        (filtroNeg === "sem_neg" && !temNeg);
      return matchSearch && matchProv && matchRel && matchContato && matchTipo && matchNeg;
    });
  }, [fabricasComContato, search, provincia, relevancia, filtroContato, filtroTipo, filtroNeg, negsMap]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(key);
      toast.success("Copiado!");
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  const chinaCount        = fabricasComContato.filter(e => e.pais === "China").length;
  const comEmailCount     = fabricasComContato.filter(e => e.contato !== null && e.contato.email !== "Não encontrado").length;
  const fabricantesCount  = fabricasComContato.filter(e => e.classificacao?.tipo === "FABRICANTE").length;
  const tradersCount      = fabricasComContato.filter(e => e.classificacao?.tipo === "TRADER").length;
  const materiaPrimaCount = fabricasComContato.filter(e => e.classificacao?.tipo === "MATERIA_PRIMA").length;
  const comNegCount       = fabricasComContato.filter(e => !!negsMap[e.nome]).length;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <NotebookPen className="w-4 h-4" />
          <span>Anotações / Diário de Negociação — NCM 4818.90.90</span>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-200">Salvo no navegador</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Fábricas Chinesas — Diário de Negociação</h1>
            <p className="text-slate-500 mt-1">
              {fabricantesCount} fabricantes · {tradersCount} traders · {materiaPrimaCount} fornec. matéria-prima
              {" · "}<span className="text-emerald-700 font-medium">{comNegCount} com negociação registrada</span>
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Proteção de dados (backup) */}
      <div className="mb-4">
        <BackupPanel tone="light" />
      </div>

      {/* Summary Cards — clicáveis para ver Top 5 da categoria */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {([
          { tipo: "FABRICANTE" as TipoEmpresa,    count: fabricantesCount,  label: "Fabricantes Diretos",      sub: "Fábrica própria confirmada", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-400", text: "text-emerald-700", sub2: "text-emerald-500" },
          { tipo: "TRADER" as TipoEmpresa,         count: tradersCount,      label: "Traders / Intermediários", sub: "Não são fábricas diretas",   bg: "bg-amber-50",   border: "border-amber-200",   ring: "ring-amber-400",   text: "text-amber-700",   sub2: "text-amber-500" },
          { tipo: "MATERIA_PRIMA" as TipoEmpresa,  count: materiaPrimaCount, label: "Fornec. Matéria-Prima",    sub: "Non-woven, PE film etc.",     bg: "bg-blue-50",    border: "border-blue-200",    ring: "ring-blue-400",    text: "text-blue-700",    sub2: "text-blue-500" },
        ]).map(cat => (
          <button
            key={cat.tipo}
            onClick={() => setActiveCategory(activeCategory === cat.tipo ? null : cat.tipo)}
            className={`${cat.bg} border ${cat.border} rounded-xl p-4 text-center transition-all hover:shadow-md active:scale-[0.98] ${
              activeCategory === cat.tipo ? `ring-2 ${cat.ring} shadow-md` : ""
            }`}
          >
            <p className={`text-3xl font-bold ${cat.text}`}>{cat.count}</p>
            <p className={`text-xs ${cat.text} font-semibold mt-1`}>{cat.label}</p>
            <p className={`text-xs ${cat.sub2} mt-0.5`}>{cat.sub}</p>
            <p className={`text-xs ${cat.text} mt-1.5 font-medium opacity-60`}>
              {activeCategory === cat.tipo ? "▲ Fechar Top 5" : "▼ Ver Top 5"}
            </p>
          </button>
        ))}
        {/* Card de negociações */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-700">{comNegCount}</p>
          <p className="text-xs text-red-700 font-semibold mt-1">Com Negociação</p>
          <p className="text-xs text-red-500 mt-0.5">Histórico registrado</p>
          <p className="text-xs text-red-600 mt-1.5 font-medium opacity-60">☁ Banco de dados</p>
        </div>
      </div>

      {/* Painel Top 5 por categoria */}
      {activeCategory && (() => {
        const top5 = fabricasComContato
          .filter(e => e.classificacao?.tipo === activeCategory)
          .slice(0, 5);
        const catInfo = tipoLabel[activeCategory];
        return (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-6 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-600" />
                <h2 className="font-bold text-slate-900 text-sm">Top 5 — {catInfo.label}</h2>
              </div>
              <button onClick={() => setActiveCategory(null)} className="text-slate-400 hover:text-slate-600 text-xs font-medium">✕ Fechar</button>
            </div>
            <div className="divide-y divide-slate-100">
              {top5.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-500 italic">Nenhuma empresa encontrada nesta categoria.</p>
              )}
              {top5.map((fab, i) => {
                const c = fab.contato;
                const key = `cat-${activeCategory}-${i}`;
                const isExp = expandedId === key;
                const neg = negsMap[fab.nome];
                const negSt = neg ? STATUS_NEG[neg.status as StatusNeg] : null;
                return (
                  <div key={fab.nome}>
                    <button
                      onClick={() => setExpandedId(isExp ? null : key)}
                      className="w-full px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? "bg-slate-800 text-white" :
                        i === 1 ? "bg-slate-600 text-white" :
                        i === 2 ? "bg-slate-400 text-white" : "bg-slate-100 text-slate-500"
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{fab.nome}</p>
                          {negSt && <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${negSt.color}`}>{negSt.label}</span>}
                        </div>
                        <p className="text-xs text-slate-500">{fab.provincia}{c?.nomeOficial ? ` · ${c.nomeOficial}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
                        {c?.email !== "Não encontrado"      && <Mail className="w-3.5 h-3.5 text-red-400" />}
                        {c?.whatsapp !== "Não encontrado"   && <MessageCircle className="w-3.5 h-3.5 text-green-400" />}
                        {c?.alibabaUrl !== "Não encontrado" && <ExternalLink className="w-3.5 h-3.5 text-orange-400" />}
                      </div>
                      {isExp ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    </button>
                    {isExp && (
                      <div className="px-4 pb-5 bg-slate-50 border-t border-slate-100">
                        {/* Badge de classificação com justificativa */}
                        {fab.classificacao && (() => {
                          const tiInfo = tipoLabel[fab.classificacao.tipo];
                          return (
                            <div className={`mt-3 p-3 rounded-lg border text-xs leading-relaxed ${
                              fab.classificacao.tipo === "FABRICANTE"    ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                              fab.classificacao.tipo === "TRADER"        ? "bg-amber-50 border-amber-200 text-amber-800" :
                              fab.classificacao.tipo === "MATERIA_PRIMA" ? "bg-blue-50 border-blue-200 text-blue-800" :
                              "bg-red-50 border-red-200 text-red-800"
                            }`}>
                              <strong>{tiInfo?.icon} {tiInfo?.label}:</strong> {fab.classificacao.justificativa}
                              {fab.classificacao.produtoReal && (
                                <div className="mt-1.5 pt-1.5 border-t border-current/20">
                                  <strong>Produto real fabricado/vendido:</strong> {fab.classificacao.produtoReal}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Contato Direto + Dados Comerciais completos */}
                        {c ? (
                          <div className="grid lg:grid-cols-2 gap-5 pt-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contato Direto</p>
                              <div className="space-y-2">
                                {c.email !== "Não encontrado" ? (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-red-500 flex-shrink-0" />
                                    <a href={`mailto:${c.email}`} className="text-sm text-blue-600 hover:underline truncate flex-1">{c.email}</a>
                                    <button onClick={() => copy(c.email, `ce-${key}`)} className="text-slate-400 hover:text-slate-600">
                                      {copiedField === `ce-${key}` ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                ) : <div className="flex items-center gap-2 text-slate-400"><Mail className="w-4 h-4" /><span className="text-sm italic">E-mail não encontrado</span></div>}

                                {c.telefone !== "Não encontrado" ? (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <span className="text-sm text-slate-700">{c.telefone}</span>
                                    <button onClick={() => copy(c.telefone, `ct-${key}`)} className="text-slate-400 hover:text-slate-600">
                                      {copiedField === `ct-${key}` ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                ) : <div className="flex items-center gap-2 text-slate-400"><Phone className="w-4 h-4" /><span className="text-sm italic">Telefone não encontrado</span></div>}

                                {c.whatsapp !== "Não encontrado" && (
                                  <div className="flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    <a href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline">{c.whatsapp}</a>
                                  </div>
                                )}

                                {c.site !== "Não encontrado" ? (
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                    <a href={c.site} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">{c.site}</a>
                                    <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  </div>
                                ) : <div className="flex items-center gap-2 text-slate-400"><Globe className="w-4 h-4" /><span className="text-sm italic">Site não encontrado</span></div>}

                                {c.alibabaUrl !== "Não encontrado" ? (
                                  <div className="flex items-center gap-2">
                                    <ExternalLink className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                    <a href={c.alibabaUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline font-medium">Ver perfil no Alibaba →</a>
                                  </div>
                                ) : <div className="flex items-center gap-2 text-slate-400"><ExternalLink className="w-4 h-4" /><span className="text-sm italic">Alibaba não encontrado</span></div>}

                                <div className="flex items-center gap-2 pt-1">
                                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                  <span className="text-sm text-slate-600">{c.cidade}, {c.provincia}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Dados Comerciais</p>
                              <div className="space-y-2 text-sm">
                                <div><span className="text-slate-500 text-xs">Produto:</span> <span className="text-slate-800">{c.produtoPrincipal}</span></div>
                                {c.moq !== "Não encontrado" && <div><span className="text-slate-500 text-xs">MOQ:</span> <span className="font-medium text-slate-800">{c.moq}</span></div>}
                                {c.precoFob !== "Não encontrado" && <div><span className="text-slate-500 text-xs">Preço FOB:</span> <span className="font-medium text-green-700">{c.precoFob}</span></div>}
                                {c.anosExperiencia !== "Não encontrado" && <div><span className="text-slate-500 text-xs">Experiência:</span> <span className="text-slate-800">{c.anosExperiencia}</span></div>}
                                {c.certificacoes !== "Não encontrado" && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {c.certificacoes.split(", ").map((cert: string) => (
                                      <span key={cert} className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{cert}</span>
                                    ))}
                                  </div>
                                )}
                                {c.observacao && (
                                  <p className="text-xs text-slate-500 leading-relaxed mt-2 bg-white rounded-lg p-2 border border-slate-100">{c.observacao}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-4 flex items-center gap-2 text-slate-400">
                            <AlertCircle className="w-4 h-4" />
                            <p className="text-sm">Dados de contato não localizados. Busque no Alibaba: <span className="font-mono text-slate-600">{fab.nome}</span></p>
                          </div>
                        )}

                        {/* Diário integrado no Top 5 */}
                        <DiarioSection
                          empresaId={fab.nome}
                          nomeEmpresa={c?.nomeOficial || fab.nome}
                          categoria={fab.classificacao ? tipoParaCategoria(fab.classificacao.tipo) : "fabrica"}
                          neg={neg}
                          onNegUpdated={() => refetch()}
                          contato={c}
                          tipoEmpresa={fab.classificacao?.tipo}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ===== FILTROS ===== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, província ou nome oficial..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <select value={provincia} onChange={e => setProvincia(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
            {provincias.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={relevancia} onChange={e => setRelevancia(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="Todas">Todos os volumes</option>
            <option value="top">Top 5</option>
            <option value="alto">Alto Volume</option>
            <option value="medio">Médio Volume</option>
            <option value="baixo">Baixo Volume</option>
          </select>
          <select value={filtroContato} onChange={e => setFiltroContato(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="todos">Todos os contatos</option>
            <option value="com_email">Com e-mail</option>
            <option value="com_alibaba">Com Alibaba</option>
            <option value="sem_contato">Sem contato</option>
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as "todos" | TipoEmpresa)}
            className="px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50 font-medium text-emerald-800">
            <option value="todos">Todos os tipos</option>
            <option value="FABRICANTE">✓ Fabricante Direto</option>
            <option value="TRADER">⚠ Trader / Intermediário</option>
            <option value="MATERIA_PRIMA">○ Fornec. Matéria-Prima</option>
          </select>
          {/* Filtro exclusivo da aba Anotações: por negociação */}
          <select value={filtroNeg} onChange={e => setFiltroNeg(e.target.value)}
            className="px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50 font-medium text-red-800">
            <option value="todos">Todas as empresas</option>
            <option value="com_neg">Com negociação</option>
            <option value="sem_neg">Sem negociação</option>
          </select>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-slate-400">
            {filtered.length} empresa(s) · {filtered.filter(e => e.classificacao?.tipo === "FABRICANTE").length} fabricante(s) · {filtered.filter(e => !!negsMap[e.nome]).length} com negociação
          </p>
        </div>
      </div>

      {/* ===== LISTA DE FÁBRICAS COM DIÁRIO INTEGRADO ===== */}
      <div className="space-y-2">
        {filtered.map((fab, i) => {
          const rel = relevanciaLabel[fab.relevancia];
          const c = fab.contato;
          const nivel = c ? nivelContato(c) : "sem";
          const key = `fab-${i}`;
          const isExp = expandedId === key;
          const cl = fab.classificacao;
          const tipoInfo = cl ? tipoLabel[cl.tipo] : null;
          const neg = negsMap[fab.nome];
          const negSt = neg ? STATUS_NEG[neg.status as StatusNeg] : null;

          return (
            <div key={fab.nome} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
              cl?.tipo === "FABRICANTE" ? "border-emerald-200" :
              cl?.tipo === "TRADER" ? "border-amber-200" :
              cl?.tipo === "MATERIA_PRIMA" ? "border-blue-200" :
              "border-slate-200"
            }`}>
              <button
                onClick={() => setExpandedId(isExp ? null : key)}
                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">{fab.nome}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${rel.color}`}>{rel.label}</span>
                    {tipoInfo && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tipoInfo.color}`}>
                        {tipoInfo.icon} {tipoInfo.label}
                      </span>
                    )}
                    {nivel === "completo" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Contato completo
                      </span>
                    )}
                    {nivel === "sem" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Sem contato
                      </span>
                    )}
                    {/* Badge de negociação */}
                    {negSt && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${negSt.color}`}>
                        <NotebookPen className="w-3 h-3" /> {negSt.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fab.pais} · {fab.provincia}
                    {c?.nomeOficial && c.nomeOficial !== "Não encontrado" ? ` · ${c.nomeOficial}` : ""}
                    {neg && neg.updatedAt ? ` · Atualizado ${fmtData(neg.updatedAt)}` : ""}
                  </p>
                </div>
                {/* Ícones de canais disponíveis */}
                <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
                  {c?.email !== "Não encontrado"      && <Mail className="w-3.5 h-3.5 text-red-400" />}
                  {c?.telefone !== "Não encontrado"   && <Phone className="w-3.5 h-3.5 text-blue-400" />}
                  {c?.whatsapp !== "Não encontrado"   && <MessageCircle className="w-3.5 h-3.5 text-green-400" />}
                  {c?.alibabaUrl !== "Não encontrado" && <ExternalLink className="w-3.5 h-3.5 text-orange-400" />}
                  {c?.site !== "Não encontrado"       && <Globe className="w-3.5 h-3.5 text-slate-400" />}
                </div>
                {isExp ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>

              {isExp && (
                <div className="px-4 pb-5 bg-slate-50 border-t border-slate-100">
                  {/* Bloco de classificação (idêntico ao Exportadores) */}
                  {cl && (
                    <div className={`mt-3 p-3 rounded-lg border text-xs leading-relaxed ${
                      cl.tipo === "FABRICANTE" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                      cl.tipo === "TRADER" ? "bg-amber-50 border-amber-200 text-amber-800" :
                      cl.tipo === "MATERIA_PRIMA" ? "bg-blue-50 border-blue-200 text-blue-800" :
                      "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      <strong>{tipoInfo?.icon} {tipoInfo?.label}:</strong> {cl.justificativa}
                      {cl.produtoReal && (
                        <div className="mt-1.5 pt-1.5 border-t border-current/20">
                          <strong>Produto real fabricado/vendido:</strong> {cl.produtoReal}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dados de contato (idêntico ao Exportadores) */}
                  {c ? (
                    <div className="grid lg:grid-cols-2 gap-5 pt-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contato Direto</p>
                        <div className="space-y-2">
                          {c.email !== "Não encontrado" ? (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-red-500 flex-shrink-0" />
                              <a href={`mailto:${c.email}`} className="text-sm text-blue-600 hover:underline truncate flex-1">{c.email}</a>
                              <button onClick={() => copy(c.email, `e-${key}`)} className="text-slate-400 hover:text-slate-600">
                                {copiedField === `e-${key}` ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : <div className="flex items-center gap-2 text-slate-400"><Mail className="w-4 h-4" /><span className="text-sm italic">E-mail não encontrado</span></div>}

                          {c.telefone !== "Não encontrado" ? (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span className="text-sm text-slate-700">{c.telefone}</span>
                              <button onClick={() => copy(c.telefone, `t-${key}`)} className="text-slate-400 hover:text-slate-600">
                                {copiedField === `t-${key}` ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : <div className="flex items-center gap-2 text-slate-400"><Phone className="w-4 h-4" /><span className="text-sm italic">Telefone não encontrado</span></div>}

                          {c.whatsapp !== "Não encontrado" && (
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <a href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline">{c.whatsapp}</a>
                            </div>
                          )}

                          {c.site !== "Não encontrado" ? (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              <a href={c.site} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">{c.site}</a>
                              <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            </div>
                          ) : <div className="flex items-center gap-2 text-slate-400"><Globe className="w-4 h-4" /><span className="text-sm italic">Site não encontrado</span></div>}

                          {c.alibabaUrl !== "Não encontrado" ? (
                            <div className="flex items-center gap-2">
                              <ExternalLink className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              <a href={c.alibabaUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline font-medium">Ver perfil no Alibaba →</a>
                            </div>
                          ) : <div className="flex items-center gap-2 text-slate-400"><ExternalLink className="w-4 h-4" /><span className="text-sm italic">Alibaba não encontrado</span></div>}

                          <div className="flex items-center gap-2 pt-1">
                            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-600">{c.cidade}, {c.provincia}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Dados Comerciais</p>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-slate-500 text-xs">Produto:</span> <span className="text-slate-800">{c.produtoPrincipal}</span></div>
                          {c.moq !== "Não encontrado" && <div><span className="text-slate-500 text-xs">MOQ:</span> <span className="font-medium text-slate-800">{c.moq}</span></div>}
                          {c.precoFob !== "Não encontrado" && <div><span className="text-slate-500 text-xs">Preço FOB:</span> <span className="font-medium text-green-700">{c.precoFob}</span></div>}
                          {c.anosExperiencia !== "Não encontrado" && <div><span className="text-slate-500 text-xs">Experiência:</span> <span className="text-slate-800">{c.anosExperiencia}</span></div>}
                          {c.certificacoes !== "Não encontrado" && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.certificacoes.split(", ").map(cert => (
                                <span key={cert} className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{cert}</span>
                              ))}
                            </div>
                          )}
                          {c.observacao && (
                            <p className="text-xs text-slate-500 leading-relaxed mt-2 bg-white rounded-lg p-2 border border-slate-100">{c.observacao}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 flex items-center gap-2 text-slate-400">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-sm">Dados de contato não localizados. Busque no Alibaba: <span className="font-mono text-slate-600">{fab.nome}</span></p>
                    </div>
                  )}

                  {/* ── DIÁRIO DE NEGOCIAÇÃO ── */}
                  <DiarioSection
                    empresaId={fab.nome}
                    nomeEmpresa={c?.nomeOficial || fab.nome}
                    categoria={cl ? tipoParaCategoria(cl.tipo) : "fabrica"}
                    neg={neg}
                    onNegUpdated={() => refetch()}
                    contato={c}
                    tipoEmpresa={cl?.tipo}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
