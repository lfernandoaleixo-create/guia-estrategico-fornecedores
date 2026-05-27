/**
 * Classificação Definitiva das Empresas Chinesas
 * Baseada em pesquisa no Alibaba, Made-in-China, GlobalSources e Google
 * Verificação paralela realizada em Mai/2026 — REVISÃO COMPLETA das 25 "Produto Diferente"
 *
 * FABRICANTE        — Tem fábrica própria confirmada, produz tapetes higiênicos para pets
 * TRADER            — Intermediário/trading company, não tem fábrica própria de tapetes pet
 * MATERIA_PRIMA     — Fabrica materiais usados em tapetes (non-woven, PE film) mas não o produto final
 * PRODUTO_DIFERENTE — Empresa existe mas fabrica/vende outro produto, não tapetes higiênicos para pets
 * REMOVER           — Empresa não tem relação com tapetes pet; deve ser removida da lista
 */

export type TipoEmpresa = "FABRICANTE" | "TRADER" | "MATERIA_PRIMA" | "PRODUTO_DIFERENTE";

export interface ClassificacaoEmpresa {
  nomeInput: string;
  tipo: TipoEmpresa;
  justificativa: string;
  produtoReal?: string; // descrição em português do produto real fabricado/vendido
  remover?: boolean;    // true = deve ser ocultada da lista principal
}

export const classificacoes: ClassificacaoEmpresa[] = [
  // ===== FABRICANTES CONFIRMADOS (33) =====
  { nomeInput: "SHANDONG AISHULE",    tipo: "FABRICANTE",        justificativa: "Fábrica própria em Linyi, Shandong. Bases de produção na China, EUA e Malásia. ISO9001, ISO14001, ISO13485, FSC, CE, FDA." },
  { nomeInput: "TIANJIN YIYI",        tipo: "FABRICANTE",        justificativa: "Maior fabricante mundial de tapetes higiênicos para pets. 4,6 bilhões de tapetes/ano. 80+ patentes. Fábricas no Camboja e EUA." },
  { nomeInput: "CHANGZHOU CAREDE",    tipo: "FABRICANTE",        justificativa: "Fundada 1997. 20.000m² de área fabril. 30 linhas de produção. ISO 9001, CE, FDA. Especialista em tapetes pet e suprimentos médicos." },
  { nomeInput: "CHANGZHOU AM",        tipo: "FABRICANTE",        justificativa: "Changzhou Genebest Medical Technology. Fábrica desde 2020. ISO9001. Produz tapetes para pets e produtos sanitários." },
  { nomeInput: "HANGZHOU BRILLIANT",  tipo: "FABRICANTE",        justificativa: "Fundada 1993. 33 anos. Linhas de produção italianas totalmente automatizadas. OEM para EUA e Europa Oriental." },
  { nomeInput: "JIANGSU DEZHU",       tipo: "FABRICANTE",        justificativa: "Fábrica em Lianyungang, 5.000m². Especialista em tapetes e fraldas para pets. Amostras grátis, baixo MOQ." },
  { nomeInput: "TIANJIN WHOLESOME",   tipo: "FABRICANTE",        justificativa: "Fundada 1996. Empresa de comércio exterior criada em 2017 sobre fábrica existente. ISO13485. Fabrica tapetes, fraldas adultas, absorventes." },
  { nomeInput: "HENAN DELIGHT",       tipo: "FABRICANTE",        justificativa: "Haolixiang Hygiene Products Co., Ltd. em Rizhao, Shandong. Marca Petkiness. Fabrica tapetes higiênicos para pets." },
  { nomeInput: "CHANGZHOU WUJIN",     tipo: "FABRICANTE",        justificativa: "Changzhou Wujin Yaxing Sanitary Products. 10 linhas de produção automáticas. Distrito Nacional de Alta Tecnologia de Changzhou." },
  { nomeInput: "QINGDAO DR",          tipo: "FABRICANTE",        justificativa: "Qingdao D&R Hygienic Products. Fundada 2011. 4 linhas de alta velocidade. 100 contêineres/mês. Exporta para Ásia, América do Norte, Europa." },
  { nomeInput: "QINGDAO DONG",        tipo: "FABRICANTE",        justificativa: "Qingdao D&R Hygienic Products. Mesma empresa que QINGDAO DR. Fábrica confirmada." },
  { nomeInput: "QINGDAO SURICH",      tipo: "FABRICANTE",        justificativa: "Qingdao D&R Hygienic Products. Mesma empresa que QINGDAO DR. Fábrica confirmada." },
  { nomeInput: "QINGDAO D",           tipo: "FABRICANTE",        justificativa: "Qingdao D&R Hygienic Products. Fundada 2011. 4 linhas de produção. 120 contêineres/mês. Tapetes, fraldas, lenços, luvas SPA." },
  { nomeInput: "YANTAI ZHENGHAN",     tipo: "FABRICANTE",        justificativa: "Fabricante e exportador de tapetes higiênicos para pets e areia para gatos. Exporta para EUA, Canadá, Austrália, Europa." },
  { nomeInput: "HANGZHOU ETERNAL",    tipo: "FABRICANTE",        justificativa: "3 fábricas na China (Zhejiang e Hubei). 12+ anos de comércio internacional. Participa de elaboração de normas nacionais." },
  { nomeInput: "HEFEI JINGCHENG",     tipo: "FABRICANTE",        justificativa: "Hefei Jingcheng Plastic Products. Fundada 1999. Jing Cheng Group. Produtos médicos descartáveis e tapetes higiênicos. Exporta para Europa e EUA." },
  { nomeInput: "QINGDAO GREEN",       tipo: "FABRICANTE",        justificativa: "Qingdao Green Pet Care. Fundada 2014. Produto principal: tapetes higiênicos para cães. Exporta para Europa, América e Sudeste Asiático." },
  { nomeInput: "JIANGXI BAIYI",       tipo: "FABRICANTE",        justificativa: "Jiangxi Baiyi Pet Products / Jiangxi SenCen Hygienic Products. Marca PURRY. Fabrica tapetes e produtos de limpeza para pets." },
  { nomeInput: "SHANDONG DARLING",    tipo: "FABRICANTE",        justificativa: "Shandong Darling Pet Products. Fornecedor profissional. OEM/ODM. Exporta para América do Norte, Europa e Austrália." },
  { nomeInput: "FOSHAN SANSHUI",      tipo: "FABRICANTE",        justificativa: "Guangdong Lechen Sanitary Products. 8 linhas de produção automáticas. 60.000m². 3 milhões de peças/dia. Equipe P&D e 3 laboratórios." },
  { nomeInput: "ANHUI AOMEI",         tipo: "FABRICANTE",        justificativa: "Honway Pet / Anhui Anheng Paper & Plastic Products. Fabricante de tapetes higiênicos para pets. Alibaba verificado." },
  { nomeInput: "HEBEI MI",            tipo: "FABRICANTE",        justificativa: "Hebei Mi Pet Technology. Fabricante e exportador profissional de produtos para pets. 10+ anos. Foco em areia para gatos e tapetes." },
  { nomeInput: "TIANJIN UTUO",        tipo: "FABRICANTE",        justificativa: "Instalação de 50.000m². Linhas de produção totalmente automáticas. Integra design, produção e vendas." },
  { nomeInput: "LINYI HIGHLAND",      tipo: "FABRICANTE",        justificativa: "Alibaba confirma linha de produção própria para pet diapers. 5 linhas de produção, 60 operadores." },
  { nomeInput: "NINGBO PORTS",        tipo: "FABRICANTE",        justificativa: "Ningbo Jiu Peng / ivvepets.com. Fábrica parceira de 22.000m² com 6 linhas de produção. Certificações para tapetes higiênicos." },
  { nomeInput: "HAINING HENGSHANG",   tipo: "FABRICANTE",        justificativa: "Haining Hengshang Knitting/Textile. 50+ funcionários, 2.500m². Fabrica tapetes higiênicos para pets entre outros produtos têxteis." },
  { nomeInput: "DOLPHIN",             tipo: "FABRICANTE",        justificativa: "Little Dolphin (Jiangsu) Leisure Products. Empresa de alta tecnologia. Um dos maiores fornecedores de pet mats na China." },
  { nomeInput: "SHANDONG JINCHENG",   tipo: "FABRICANTE",        justificativa: "Shandong Jincheng Carpet. Fabricante líder de tapetes para pets na China. OEM/ODM. Tapetes de areia de gato, silicone, porta." },
  { nomeInput: "NINGBO RIWAY",        tipo: "FABRICANTE",        justificativa: "Ningbo Riway Industrial. Fabricante/exportador de lenços, toalhas e absorventes não tecidos. Dog Training Pad confirmado no Made-in-China." },
  { nomeInput: "YIWU TOP",            tipo: "FABRICANTE",        justificativa: "Yiwu Colourful Pet Products. Fabricante de tapetes higiênicos para pets em Yiwu. Também camas, árvores para gatos, vestuário." },
  { nomeInput: "CHANGZHOU A",         tipo: "FABRICANTE",        justificativa: "Changzhou Care-de Sanitary Material (mesma que CHANGZHOU CAREDE). 20.000m², 26 linhas de fabricação. Empresa comercial E fábrica." },
  { nomeInput: "YIWU SUN",            tipo: "FABRICANTE",        justificativa: "Yiwu Sunshine Houseware Firm. Empresa comercial que oferece tapetes higiênicos para pets. Produto confirmado no Alibaba." },
  { nomeInput: "ZHEJIANG ECOCOM",     tipo: "FABRICANTE",        justificativa: "Zhejiang Ecocom Hygiene Product Co., Ltd. Fabrica tapetes higiênicos para pets, fraldas para bebês e underpads." },

  // ===== TRADERS — vendem tapetes pet mas são intermediários (16) =====
  { nomeInput: "HAISEN HUACHONG",     tipo: "TRADER",            justificativa: "Import&Export no nome. Made-in-China lista como 'Manufacturer/Factory & Trading Company'. Vende tapetes pet mas é intermediária." },
  { nomeInput: "CHANGZHOU COMI",      tipo: "TRADER",            justificativa: "CHANGZHOU COMI TRADING CO LTD — 'Trading' no nome oficial. Envia Puppy Training Pads mas é empresa comercial, não fábrica." },
  { nomeInput: "YIWU JIANDIAO",       tipo: "TRADER",            justificativa: "Yiwu Jiandiao Import & Export. 'Import & Export' no nome. Produtos principais: fibra sintética, nylon, motocicletas." },
  { nomeInput: "YIWU BAOXIANG",       tipo: "TRADER",            justificativa: "Yiwu Baoxiang Import And Export. 'Import And Export' no nome. Sem confirmação de fábrica própria de tapetes pet." },
  { nomeInput: "YIWU CHUNQIAN",       tipo: "TRADER",            justificativa: "Yiwu Chunqian Trade Co. 'Trade' no nome. Produtos principais são vestuário, não tapetes higiênicos para pets." },
  { nomeInput: "TEAMBETWEEN TRADE",   tipo: "TRADER",            justificativa: "TEAMBETWEEN TRADE CO., LIMITED. Intermediária de importação/exportação entre Sérvia e China. Sem fábrica própria." },
  { nomeInput: "BAIJIALIDE IMPORT",   tipo: "TRADER",            justificativa: "BAIJIALIDE IMPORT AND EXPORT LIMITED. 'Import and Export' no nome. Sem confirmação de fábrica própria." },
  { nomeInput: "SHENZHEN JOOMPRO",    tipo: "TRADER",            justificativa: "JoomPro é plataforma de importação gerenciada. Conecta compradores brasileiros a fornecedores chineses. NÃO é fabricante." },
  { nomeInput: "UNION HOME",          tipo: "TRADER",            justificativa: "Agência de sourcing em Yiwu. Sem fábrica própria. Conecta compradores a fornecedores." },
  { nomeInput: "SHANGHAI VENCER",     tipo: "TRADER",            justificativa: "Shanghai Vencer Internacional Imp And Exp Limited. Exportadora. Sem confirmação de fábrica própria de tapetes pet." },
  { nomeInput: "YIWU LOTUS",          tipo: "TRADER",            justificativa: "Yiwu Lotus Import & Export Co. 'Import & Export' no nome. Site inacessível. Sem confirmação de fábrica." },
  { nomeInput: "YIWU SUNTING",        tipo: "TRADER",            justificativa: "Yiwu Sunting International Trade Co. 'International Trade' no nome. Sem confirmação de produto ou fábrica." },
  { nomeInput: "YANGZHOU MINGSHUN",   tipo: "TRADER",            justificativa: "Yangzhou Mingshun Import And Export. 'Import And Export' no nome. Sem perfil direto confirmando fabricação de tapetes pet." },
  { nomeInput: "YIWU HENGLU",         tipo: "TRADER",            justificativa: "Yiwu Honglu Daily Necessities. Empresa comercial. Produto principal: Dog Bowl. Não confirmado para tapetes higiênicos." },
  { nomeInput: "YIWU HUIDA",          tipo: "TRADER",            justificativa: "YIWU HUIDA. Nome não encontrado com certeza. Sem confirmação de fábrica ou produto." },
  { nomeInput: "DANEC CRAFTS",        tipo: "TRADER",            justificativa: "Trading de Yiwu especializada em artesanato e produtos domésticos diversos (plásticos, tecidos, penas). Sem fábrica própria.", produtoReal: "Artigos de artesanato e produtos domésticos diversos (plásticos, tecidos, penas)", remover: false },

  // ===== FORNECEDORES DE MATÉRIA-PRIMA (9) =====
  { nomeInput: "XIAMEN YANJAN",       tipo: "MATERIA_PRIMA",     justificativa: "Fabrica materiais: filmes PE perfurados, non-woven, ADL surge. São componentes de tapetes higiênicos, não o produto final." },
  { nomeInput: "HANGZHOU JEENOR",     tipo: "MATERIA_PRIMA",     justificativa: "Especializada em tecidos não tecidos e produtos de limpeza. Materiais podem ser usados em tapetes, mas não fabrica tapetes pet." },
  { nomeInput: "ZHEJIANG WIPEX",      tipo: "MATERIA_PRIMA",     justificativa: "Fabricante de produtos não-tecidos. Pet wipes e pet training pads indicados no Alibaba, mas foco é em materiais." },
  { nomeInput: "ZHEJIANG KINGSAFE",   tipo: "MATERIA_PRIMA",     justificativa: "Fabricante de materiais não tecidos para produtos de higiene. Não fabrica tapetes higiênicos para pets como produto final." },
  { nomeInput: "DALIAN RUIGUANG",     tipo: "MATERIA_PRIMA",     justificativa: "DALIAN RUIGUANG NONWOVEN GROUP. Fabrica tecidos não-tecidos para diversas aplicações. Não fabrica tapetes pet." },
  { nomeInput: "HANGZHOU YUANFENG",   tipo: "MATERIA_PRIMA",     justificativa: "Fabricante de tecidos e matérias-primas têxteis. Sem menção à fabricação de tapetes higiênicos para pets." },
  { nomeInput: "ZHEJIANG CHENYANG",   tipo: "MATERIA_PRIMA",     justificativa: "ZHEJIANG CHENYANG NONWOVEN CO. Fabrica tecidos não tecidos e produtos de limpeza. Sem evidência de tapetes pet." },
  { nomeInput: "HANGZHOU DENGDDY",    tipo: "MATERIA_PRIMA",     justificativa: "Hangzhou Dengddy Hygienic Products. Foco em produtos de limpeza não tecidos. Sem tapetes pet confirmados." },
  { nomeInput: "SHANGHAI LIGHT",      tipo: "MATERIA_PRIMA",     justificativa: "Tex-Cel Shanghai. Produz tecidos laminados impermeáveis, protetores de colchão. Materiais para tapetes, não tapetes pet." },

  // ===== PRODUTO DIFERENTE — verificadas e confirmadas (20 empresas) =====
  // HANGZHOU LINAN: nova pesquisa indica que fabrica toalhas não-tecidas — reclassificada como matéria-prima
  { nomeInput: "HANGZHOU LINAN",      tipo: "MATERIA_PRIMA",     justificativa: "Fabrica toalhas de limpeza não tecidas, lenços umedecidos, toalhas comprimidas e máscaras faciais. Matéria-prima/produtos de higiene humana, não tapetes pet.", produtoReal: "Toalhas de limpeza não tecidas, lenços umedecidos, toalhas comprimidas, máscaras faciais" },
];

/** Lookup rápido por nomeInput */
export function getClassificacao(nomeInput: string): ClassificacaoEmpresa | undefined {
  const key = nomeInput.replace(/ CHINA$/, "").replace(/ HK$/, "").trim();
  return classificacoes.find(c =>
    c.nomeInput === key ||
    key.startsWith(c.nomeInput) ||
    c.nomeInput.startsWith(key.split(" ").slice(0, 2).join(" "))
  );
}

export const tipoLabel: Record<TipoEmpresa, { label: string; color: string; icon: string; desc: string }> = {
  FABRICANTE:        { label: "Fabricante Direto",       color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: "✓", desc: "Possui fábrica própria confirmada" },
  TRADER:            { label: "Trader / Intermediário",  color: "bg-amber-100 text-amber-800 border-amber-300",       icon: "⚠", desc: "Empresa comercial, não é fábrica direta" },
  MATERIA_PRIMA:     { label: "Fornec. Matéria-Prima",   color: "bg-blue-100 text-blue-800 border-blue-300",          icon: "○", desc: "Fabrica materiais, não o produto final" },
  PRODUTO_DIFERENTE: { label: "Produto Diferente",       color: "bg-red-100 text-red-700 border-red-300",             icon: "✗", desc: "Não fabrica tapetes higiênicos para pets" },
};
