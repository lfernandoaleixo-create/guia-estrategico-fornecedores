/**
 * Página: Contato com Fábricas Chinesas
 * Design: Portal de Inteligência Comercial — azul-marinho + vermelho-China + dourado
 * Dados: LogComex NCM 4818.90.90 + pesquisa Alibaba/Made-in-China/sites oficiais
 * 60 empresas com contato verificado (e-mail, telefone, WhatsApp, site, Alibaba)
 */
import { useState, useMemo } from "react";
import Layout from "@tapete/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { contatosFabricas } from "@tapete/lib/contatos";
import {
  Mail,
  Phone,
  MessageCircle,
  Globe,
  ExternalLink,
  Search,
  Copy,
  CheckCheck,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  ShieldCheck,
  Package,
  AlertCircle,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

const PROVINCIAS = [
  "Todas",
  "Shandong",
  "Zhejiang",
  "Jiangsu",
  "Tianjin",
  "Fujian",
  "Guangdong",
  "Anhui",
  "Hebei",
  "Liaoning",
  "Jiangxi",
  "Henan",
];

type FiltroContato = "todos" | "com_email" | "com_alibaba" | "sem_contato";

function temContato(f: typeof contatosFabricas[0]) {
  return f.email !== "Não encontrado" || f.alibabaUrl !== "Não encontrado" || f.site !== "Não encontrado";
}

function nivelContato(f: typeof contatosFabricas[0]): "completo" | "parcial" | "sem" {
  const pontos =
    (f.email !== "Não encontrado" ? 2 : 0) +
    (f.telefone !== "Não encontrado" ? 1 : 0) +
    (f.whatsapp !== "Não encontrado" ? 1 : 0) +
    (f.alibabaUrl !== "Não encontrado" ? 1 : 0) +
    (f.site !== "Não encontrado" ? 1 : 0);
  if (pontos >= 3) return "completo";
  if (pontos >= 1) return "parcial";
  return "sem";
}

export default function Contato() {
  const [busca, setBusca] = useState("");
  const [provincia, setProvincia] = useState("Todas");
  const [filtroContato, setFiltroContato] = useState<FiltroContato>("todos");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [copiados, setCopiados] = useState<Set<string>>(new Set());

  const fabricasFiltradas = useMemo(() => {
    return contatosFabricas.filter((f) => {
      const matchBusca =
        busca === "" ||
        f.nomeOficial.toLowerCase().includes(busca.toLowerCase()) ||
        f.nomeInput.toLowerCase().includes(busca.toLowerCase()) ||
        f.email.toLowerCase().includes(busca.toLowerCase()) ||
        f.cidade.toLowerCase().includes(busca.toLowerCase()) ||
        f.produtoPrincipal.toLowerCase().includes(busca.toLowerCase());

      const matchProvincia =
        provincia === "Todas" ||
        f.provincia.toLowerCase().includes(provincia.toLowerCase());

      const matchContato =
        filtroContato === "todos" ||
        (filtroContato === "com_email" && f.email !== "Não encontrado") ||
        (filtroContato === "com_alibaba" && f.alibabaUrl !== "Não encontrado") ||
        (filtroContato === "sem_contato" && !temContato(f));

      return matchBusca && matchProvincia && matchContato;
    });
  }, [busca, provincia, filtroContato]);

  const copiar = (texto: string, chave: string) => {
    if (texto === "Não encontrado" || texto === "") return;
    navigator.clipboard.writeText(texto);
    setCopiados((prev) => new Set(prev).add(chave));
    toast.success("Copiado!");
    setTimeout(() => {
      setCopiados((prev) => {
        const novo = new Set(prev);
        novo.delete(chave);
        return novo;
      });
    }, 2000);
  };

  const exportarCSV = () => {
    const headers = [
      "Nº",
      "Nome Oficial",
      "E-mail",
      "Telefone",
      "WhatsApp",
      "Site",
      "Alibaba",
      "Cidade",
      "Província",
      "Produto Principal",
      "MOQ",
      "Preço FOB",
      "Certificações",
      "Anos de Experiência",
      "Observação",
    ];
    const rows = fabricasFiltradas.map((f, i) => [
      i + 1,
      f.nomeOficial !== "Não encontrado" ? f.nomeOficial : f.nomeInput,
      f.email,
      f.telefone,
      f.whatsapp,
      f.site,
      f.alibabaUrl,
      f.cidade,
      f.provincia,
      f.produtoPrincipal,
      f.moq,
      f.precoFob,
      f.certificacoes,
      f.anosExperiencia,
      f.observacao.replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fabricas-tapete-higienico-china-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${fabricasFiltradas.length} fábricas exportadas em CSV!`);
  };

  // Estatísticas
  const stats = useMemo(() => ({
    total: contatosFabricas.length,
    comEmail: contatosFabricas.filter((f) => f.email !== "Não encontrado").length,
    comAlibaba: contatosFabricas.filter((f) => f.alibabaUrl !== "Não encontrado").length,
    comWhatsApp: contatosFabricas.filter((f) => f.whatsapp !== "Não encontrado").length,
    comSite: contatosFabricas.filter((f) => f.site !== "Não encontrado").length,
    completo: contatosFabricas.filter((f) => nivelContato(f) === "completo").length,
  }), []);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-red-600 text-white text-xs">NCM 4818.90.90</Badge>
            <Badge variant="outline" className="text-xs border-slate-300">
              LogComex · Jun/2025–Mai/2026
            </Badge>
            <Badge variant="outline" className="text-xs border-green-300 text-green-700">
              Dados verificados
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            Contato Direto com Fábricas Chinesas
          </h1>
          <p className="text-slate-500 text-sm">
            {stats.total} fábricas identificadas via LogComex · Contatos pesquisados no Alibaba, Made-in-China e sites oficiais
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total de Empresas", valor: stats.total, cor: "bg-slate-50 border-slate-200 text-slate-700", icon: <Package className="w-4 h-4" /> },
            { label: "Com E-mail", valor: stats.comEmail, cor: "bg-blue-50 border-blue-200 text-blue-700", icon: <Mail className="w-4 h-4" /> },
            { label: "Com Telefone/WhatsApp", valor: stats.comWhatsApp, cor: "bg-green-50 border-green-200 text-green-700", icon: <Phone className="w-4 h-4" /> },
            { label: "Com Alibaba", valor: stats.comAlibaba, cor: "bg-orange-50 border-orange-200 text-orange-700", icon: <ExternalLink className="w-4 h-4" /> },
            { label: "Contato Completo", valor: stats.completo, cor: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: <CheckCircle2 className="w-4 h-4" /> },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 ${s.cor}`}>
              <div className="flex items-center gap-1.5 mb-1 opacity-70">
                {s.icon}
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              <div className="text-2xl font-bold">{s.valor}</div>
            </div>
          ))}
        </div>

        {/* Template de contato */}
        <div className="bg-slate-900 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white text-sm">
                Template de Primeiro Contato (Inglês)
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Copie, substitua os campos em colchetes e envie diretamente
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
              onClick={() =>
                copiar(
                  `Dear Sir/Madam,

My name is [Your Name], from [Your Company], Brazil.

We are interested in importing Pet Training Pads / Dog Pee Pads to Brazil and would like to establish a long-term business relationship with your company.

Could you please provide the following information:
1. Product catalog with available sizes and specifications (30x30, 33x45, 45x60, 60x90 cm)
2. FOB price list (USD per piece) for quantities of [X] pieces/month
3. MOQ (Minimum Order Quantity)
4. Lead time for production
5. Available certifications (ISO, CE, FDA, etc.)
6. Can you do OEM/Private Label? If yes, minimum quantity?
7. Payment terms

We are ready to start with a trial order and scale up based on quality.

Best regards,
[Your Name]
[Your Company] | Brazil
WhatsApp: +55 [Your Number]
Email: [your@email.com]`,
                  "template"
                )
              }
            >
              {copiados.has("template") ? (
                <CheckCheck className="w-3 h-3 mr-1 text-green-400" />
              ) : (
                <Copy className="w-3 h-3 mr-1" />
              )}
              {copiados.has("template") ? "Copiado!" : "Copiar Template"}
            </Button>
          </div>
          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-800 rounded-lg p-4 overflow-x-auto">
{`Dear Sir/Madam,

My name is [Your Name], from [Your Company], Brazil.

We are interested in importing Pet Training Pads / Dog Pee Pads to Brazil.

Could you please provide:
1. Product catalog and FOB price list (USD/piece)
2. MOQ and available sizes (30x30, 45x60, 60x90 cm)
3. Lead time and certifications (ISO, CE, FDA)
4. OEM/Private Label options and minimum quantity

We seek a long-term supplier for the Brazilian market.

Best regards,
[Your Name] | [Your Company] | Brazil`}
          </pre>
        </div>

        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, e-mail, cidade, produto..."
                  className="pl-9"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

            </div>

            {/* Filtro por contato */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3" /> Contato:
              </span>
              {[
                { key: "todos", label: "Todos" },
                { key: "com_email", label: `Com e-mail (${stats.comEmail})` },
                { key: "com_alibaba", label: `Com Alibaba (${stats.comAlibaba})` },
                { key: "sem_contato", label: "Sem contato" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFiltroContato(f.key as FiltroContato)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    filtroContato === f.key
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Filtro por província */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
                <MapPin className="w-3 h-3" /> Província:
              </span>
              {PROVINCIAS.map((p) => (
                <button
                  key={p}
                  onClick={() => setProvincia(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    provincia === p
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Mostrando <strong className="text-slate-700">{fabricasFiltradas.length}</strong> de{" "}
          {contatosFabricas.length} fábricas
        </p>

        {/* Lista de fábricas */}
        <div className="space-y-2">
          {fabricasFiltradas.map((fabrica, idx) => {
            const isExpanded = expandido === fabrica.nomeInput;
            const nivel = nivelContato(fabrica);
            const hasEmail = fabrica.email !== "Não encontrado";
            const hasPhone = fabrica.telefone !== "Não encontrado";
            const hasWhatsApp = fabrica.whatsapp !== "Não encontrado";
            const hasAlibaba = fabrica.alibabaUrl !== "Não encontrado";
            const hasSite = fabrica.site !== "Não encontrado";
            const nomePrincipal =
              fabrica.nomeOficial !== "Não encontrado"
                ? fabrica.nomeOficial
                : fabrica.nomeInput;

            return (
              <div
                key={fabrica.nomeInput}
                className={`bg-white rounded-xl border transition-all duration-200 ${
                  isExpanded
                    ? "border-blue-300 shadow-md"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                {/* Header do card */}
                <div
                  className="p-4 cursor-pointer select-none"
                  onClick={() =>
                    setExpandido(isExpanded ? null : fabrica.nomeInput)
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Número */}
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-0.5">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                            {nomePrincipal}
                          </h3>
                          {/* Badge de nível de contato */}
                          {nivel === "completo" && (
                            <span className="flex items-center gap-0.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              Contato completo
                            </span>
                          )}
                          {nivel === "sem" && (
                            <span className="flex items-center gap-0.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                              <AlertCircle className="w-3 h-3" />
                              Sem contato
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            {fabrica.cidade !== "Não identificada" &&
                            fabrica.cidade !== "Não encontrado"
                              ? `${fabrica.cidade}, `
                              : ""}
                            {fabrica.provincia}
                          </span>
                          {fabrica.anosExperiencia !== "Não encontrado" && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {fabrica.anosExperiencia}
                            </span>
                          )}
                        </div>
                        {/* Preview do e-mail quando não expandido */}
                        {!isExpanded && hasEmail && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <Mail className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="text-xs text-blue-600 font-mono truncate">
                              {fabrica.email.split(",")[0].trim()}
                            </span>
                            <button
                              className="text-slate-400 hover:text-slate-600 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copiar(
                                  fabrica.email.split(",")[0].trim(),
                                  `email-prev-${fabrica.nomeInput}`
                                );
                              }}
                            >
                              {copiados.has(`email-prev-${fabrica.nomeInput}`) ? (
                                <CheckCheck className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ícones de disponibilidade */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasEmail && (
                        <div
                          className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center"
                          title="E-mail disponível"
                        >
                          <Mail className="w-3 h-3 text-blue-600" />
                        </div>
                      )}
                      {(hasPhone || hasWhatsApp) && (
                        <div
                          className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"
                          title="Telefone/WhatsApp disponível"
                        >
                          <Phone className="w-3 h-3 text-green-600" />
                        </div>
                      )}
                      {hasAlibaba && (
                        <div
                          className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center"
                          title="Alibaba disponível"
                        >
                          <ExternalLink className="w-3 h-3 text-orange-600" />
                        </div>
                      )}
                      {hasSite && (
                        <div
                          className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center"
                          title="Site disponível"
                        >
                          <Globe className="w-3 h-3 text-purple-600" />
                        </div>
                      )}
                      <div className="ml-1">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div className="px-4 pb-5 border-t border-slate-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Coluna de contatos */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Contatos
                        </h4>

                        {/* E-mail */}
                        <ContactRow
                          icon={<Mail className="w-3.5 h-3.5 text-blue-600" />}
                          bg="bg-blue-50"
                          label="E-mail"
                          value={fabrica.email}
                          copyKey={`email-${fabrica.nomeInput}`}
                          copiados={copiados}
                          onCopy={copiar}
                          isLink={false}
                        />

                        {/* Telefone */}
                        <ContactRow
                          icon={<Phone className="w-3.5 h-3.5 text-green-600" />}
                          bg="bg-green-50"
                          label="Telefone"
                          value={fabrica.telefone}
                          copyKey={`tel-${fabrica.nomeInput}`}
                          copiados={copiados}
                          onCopy={copiar}
                          isLink={false}
                        />

                        {/* WhatsApp */}
                        <ContactRow
                          icon={<MessageCircle className="w-3.5 h-3.5 text-emerald-600" />}
                          bg="bg-emerald-50"
                          label="WhatsApp"
                          value={fabrica.whatsapp}
                          copyKey={`wa-${fabrica.nomeInput}`}
                          copiados={copiados}
                          onCopy={copiar}
                          isLink={true}
                          linkHref={
                            fabrica.whatsapp !== "Não encontrado"
                              ? `https://wa.me/${fabrica.whatsapp.replace(/\D/g, "")}`
                              : undefined
                          }
                        />

                        {/* Site */}
                        <ContactRow
                          icon={<Globe className="w-3.5 h-3.5 text-purple-600" />}
                          bg="bg-purple-50"
                          label="Site Oficial"
                          value={hasSite ? fabrica.site.replace(/^https?:\/\//, "") : "Não encontrado"}
                          copyKey={`site-${fabrica.nomeInput}`}
                          copiados={copiados}
                          onCopy={copiar}
                          isLink={true}
                          linkHref={hasSite ? fabrica.site : undefined}
                        />

                        {/* Alibaba */}
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                            <ExternalLink className="w-3.5 h-3.5 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-400 mb-0.5">Alibaba</div>
                            {hasAlibaba ? (
                              <a
                                href={fabrica.alibabaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-orange-700 hover:underline flex items-center gap-1"
                              >
                                Ver perfil no Alibaba
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ) : (
                              <a
                                href={`https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(
                                  fabrica.nomeInput + " pee pad"
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-orange-500 hover:underline flex items-center gap-1"
                              >
                                Buscar no Alibaba →
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Coluna de informações comerciais */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Informações Comerciais
                        </h4>

                        <div className="grid grid-cols-2 gap-2">
                          <InfoBox label="MOQ" value={fabrica.moq} />
                          <InfoBox label="Preço FOB" value={fabrica.precoFob} />
                          <InfoBox label="Experiência" value={fabrica.anosExperiencia} />
                          <InfoBox
                            label="Certificações"
                            value={fabrica.certificacoes}
                            small
                          />
                        </div>

                        {fabrica.produtoPrincipal !== "Não encontrado" && (
                          <div className="bg-slate-50 rounded-lg p-2.5">
                            <div className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                              <Package className="w-3 h-3" /> Produto Principal
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed">
                              {fabrica.produtoPrincipal}
                            </div>
                          </div>
                        )}

                        {fabrica.observacao &&
                          fabrica.observacao !== "" &&
                          fabrica.observacao !== "Não encontrado" && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                              <div className="text-xs text-amber-600 font-medium mb-0.5">
                                Observação
                              </div>
                              <div className="text-xs text-amber-800 leading-relaxed line-clamp-4">
                                {fabrica.observacao}
                              </div>
                            </div>
                          )}

                        {/* Botão de e-mail direto */}
                        {hasEmail && (
                          <a
                            href={`mailto:${fabrica.email
                              .split(",")[0]
                              .trim()}?subject=Inquiry%20about%20Pet%20Pee%20Pads%20-%20Brazil%20Importer&body=Dear%20Sir%2FMadam%2C%0A%0AMy%20name%20is%20%5BYour%20Name%5D%2C%20from%20%5BYour%20Company%5D%2C%20Brazil.%0A%0AWe%20are%20interested%20in%20importing%20Pet%20Training%20Pads%20to%20Brazil.%0A%0ACould%20you%20please%20provide%3A%0A1.%20Product%20catalog%20and%20FOB%20price%20list%0A2.%20MOQ%20and%20available%20sizes%0A3.%20Lead%20time%20and%20certifications%0A4.%20OEM%2FPrivate%20Label%20options%0A%0ABest%20regards`}
                            className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                            Enviar E-mail de Prospecção
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {fabricasFiltradas.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma fábrica encontrada</p>
            <p className="text-sm mt-1">
              Tente outros termos de busca ou remova os filtros
            </p>
          </div>
        )}

        {/* Nota de rodapé */}
        <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong>Nota sobre os dados:</strong> Os contatos foram pesquisados
            individualmente no Alibaba, Made-in-China, GlobalSources e sites
            oficiais. Algumas empresas da lista LogComex são trading companies ou
            fabricantes de materiais (não-tecidos, PE film), não fabricantes de
            tapetes acabados — essas estão marcadas na observação. Para fábricas
            sem contato encontrado, use a busca direta no Alibaba pelo nome da
            empresa. Recomenda-se verificar os dados antes de enviar propostas
            comerciais.
          </p>
        </div>
      </div>
    </Layout>
  );
}

// Componente auxiliar para linha de contato
function ContactRow({
  icon,
  bg,
  label,
  value,
  copyKey,
  copiados,
  onCopy,
  isLink,
  linkHref,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  copyKey: string;
  copiados: Set<string>;
  onCopy: (text: string, key: string) => void;
  isLink: boolean;
  linkHref?: string;
}) {
  const hasValue = value !== "Não encontrado" && value !== "";
  return (
    <div className="flex items-start gap-2">
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-400 mb-0.5">{label}</div>
        {hasValue ? (
          <div className="flex items-center gap-2">
            {isLink && linkHref ? (
              <a
                href={linkHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-800 hover:underline break-all"
              >
                {value}
              </a>
            ) : (
              <span className="text-sm text-slate-800 font-mono break-all">{value}</span>
            )}
            <button
              className="shrink-0 text-slate-400 hover:text-slate-600"
              onClick={() => onCopy(value, copyKey)}
            >
              {copiados.has(copyKey) ? (
                <CheckCheck className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ) : (
          <span className="text-sm text-slate-400 italic">Não encontrado</span>
        )}
      </div>
    </div>
  );
}

// Componente auxiliar para caixa de informação
function InfoBox({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  const hasValue = value !== "Não encontrado" && value !== "";
  return (
    <div className="bg-slate-50 rounded-lg p-2.5">
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className={`font-semibold text-slate-800 ${small ? "text-xs" : "text-sm"}`}>
        {hasValue ? value : <span className="text-slate-400 font-normal italic">—</span>}
      </div>
    </div>
  );
}
