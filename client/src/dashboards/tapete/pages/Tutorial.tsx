import { useState } from "react";
import Layout from "@tapete/components/Layout";
import { tutorialEtapas } from "@tapete/lib/data";
import { BookOpen, CheckCircle, Clock, FileText, Lightbulb, ChevronDown, ChevronUp, Building } from "lucide-react";

export default function Tutorial() {
  const [expandedEtapa, setExpandedEtapa] = useState<number | null>(1);

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <BookOpen className="w-4 h-4" />
          <span>Guia Completo de Importacao</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Tutorial: Como Importar da China</h1>
        <p className="text-slate-500 mt-1">8 etapas completas para importar tapetes higienicos para caes — NCM 4818.90.90</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700">Fluxo do Processo de Importacao</p>
          <span className="text-xs text-slate-400">8 etapas</span>
        </div>
        <div className="flex items-center gap-1">
          {tutorialEtapas.map((etapa, i) => (
            <div key={etapa.etapa} className="flex items-center flex-1">
              <button
                onClick={() => setExpandedEtapa(expandedEtapa === etapa.etapa ? null : etapa.etapa)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${expandedEtapa === etapa.etapa ? "bg-red-600 text-white ring-2 ring-red-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {etapa.etapa}
              </button>
              {i < tutorialEtapas.length - 1 && <div className="flex-1 h-0.5 bg-slate-200 mx-1" />}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-xs text-slate-400">SISCOMEX</span>
          <span className="text-xs text-slate-400">Marca/INPI</span>
        </div>
      </div>

      {/* Etapas */}
      <div className="space-y-3">
        {tutorialEtapas.map((etapa) => (
          <div key={etapa.etapa} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${expandedEtapa === etapa.etapa ? "border-red-200" : "border-slate-200"}`}>
            <button
              onClick={() => setExpandedEtapa(expandedEtapa === etapa.etapa ? null : etapa.etapa)}
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${expandedEtapa === etapa.etapa ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                {etapa.etapa}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm">{etapa.titulo}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{etapa.orgao}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{etapa.prazo}</span>
                  </div>
                </div>
              </div>
              {expandedEtapa === etapa.etapa ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            </button>

            {expandedEtapa === etapa.etapa && (
              <div className="px-5 pb-5 border-t border-slate-100">
                <p className="text-sm text-slate-700 leading-relaxed mt-4 mb-4">{etapa.descricao}</p>
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Documentos Necessarios</p>
                    </div>
                    <ul className="space-y-1.5">
                      {etapa.documentos.map((doc) => (
                        <li key={doc} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-slate-700">{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Dica Profissional</p>
                    </div>
                    <p className="text-sm text-amber-800 leading-relaxed">{etapa.dica}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
