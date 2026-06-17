// =============================================================================
// docxTranslate.test.ts
//
// Garante que a tradução de Word (.docx) preserva a FORMATAÇÃO: só o conteúdo
// textual dos nós <w:t> é trocado; estilos (<w:rPr>), tabelas (<w:tbl>),
// atributos e toda a estrutura XML permanecem intactos.
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  collectWordRunTexts,
  applyWordTranslation,
  decodeXmlEntities,
  encodeXmlEntities,
} from "../client/src/shared/supplier-notes/docxTranslate";

// document.xml mínimo, porém realista: um parágrafo com estilo (negrito) e
// uma tabela de 1 célula. O texto é chinês (traduzível).
const DOC_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>产品目录</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">价格 </w:t></w:r><w:r><w:t>说明</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>颜色</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:r><w:t>2024</w:t></w:r></w:p>
</w:body></w:document>`;

const DICT: Record<string, string> = {
  "产品目录": "Catálogo de produtos",
  "价格 ": "Preço ",
  "说明": "Descrição",
  "颜色": "Cor",
};

const lookup = (zh: string) => DICT[zh] ?? DICT[zh.trim()];

describe("docxTranslate — preserva formatação", () => {
  it("coleta o texto de cada nó <w:t> (inclui runs separados)", () => {
    const texts = collectWordRunTexts(DOC_XML);
    expect(texts).toContain("产品目录");
    expect(texts).toContain("说明");
    expect(texts).toContain("颜色");
    // O run com xml:space="preserve" mantém o espaço final.
    expect(texts).toContain("价格 ");
  });

  it("substitui apenas o texto, mantendo o texto traduzido", () => {
    const out = applyWordTranslation(DOC_XML, lookup);
    expect(out).toContain("Catálogo de produtos");
    expect(out).toContain("Descrição");
    expect(out).toContain("Cor");
    // O chinês original não deve sobrar.
    expect(out).not.toContain("产品目录");
    expect(out).not.toContain("颜色");
  });

  it("mantém estilos, tabelas e atributos intactos", () => {
    const out = applyWordTranslation(DOC_XML, lookup);
    // Estilo de negrito preservado.
    expect(out).toContain("<w:rPr><w:b/></w:rPr>");
    // Alinhamento central preservado.
    expect(out).toContain('<w:jc w:val="center"/>');
    // Estrutura de tabela preservada.
    expect(out).toContain("<w:tbl>");
    expect(out).toContain("</w:tbl>");
    // Cabeçalho XML preservado.
    expect(out).toContain('<?xml version="1.0"');
  });

  it("preserva espaços com xml:space=preserve e adiciona quando necessário", () => {
    const out = applyWordTranslation(DOC_XML, lookup);
    // O run que já tinha xml:space não é duplicado e mantém o espaço.
    expect(out).toContain('xml:space="preserve">Preço ');
    // O run de '颜色' não tinha xml:space; como a tradução "Cor" não tem espaço
    // nas bordas, ainda assim adicionamos preserve por segurança — verificamos
    // apenas que o texto foi trocado corretamente.
    expect(out).toContain(">Cor</w:t>");
  });

  it("não altera texto que já está em português ou é numérico", () => {
    const out = applyWordTranslation(DOC_XML, lookup);
    // "2024" não é traduzível → permanece.
    expect(out).toContain(">2024</w:t>");
  });

  it("é idempotente quando o lookup não encontra tradução", () => {
    const noop = () => undefined;
    const out = applyWordTranslation(DOC_XML, noop);
    expect(out).toBe(DOC_XML);
  });

  it("decode/encode de entidades XML são consistentes", () => {
    const raw = 'a & b < c > d "e" \'f\'';
    const encoded = encodeXmlEntities(raw);
    expect(encoded).toContain("&amp;");
    expect(encoded).toContain("&lt;");
    expect(encoded).toContain("&gt;");
    // decode reverte as entidades básicas.
    expect(decodeXmlEntities("a &amp; b &lt; c &gt; d")).toBe("a & b < c > d");
  });
});
