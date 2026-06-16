import { describe, it, expect } from "vitest";
import { buildDuplicatePayload } from "../client/src/shared/supplier-notes/duplicateSupplier";
import type { CustomSupplier } from "../client/src/shared/supplier-notes/useCustomSuppliers";

function makeSource(): CustomSupplier {
  return {
    id: "custom-aquario-123-abc",
    scope: "aquario",
    createdAt: 1000,
    updatedAt: 2000,
    name: "Guangzhou Jiarong",
    chineseName: "广州嘉荣",
    category: "Terrários",
    ncm: "9506",
    city: "Guangzhou",
    province: "Guangdong",
    district: "Liwan",
    floor: "3F",
    gate: "A12",
    address: "Rua Tal, 100",
    phones: [{ id: "p1", label: "WhatsApp", value: "+86 111" }],
    emails: [{ id: "e1", label: "Vendas", value: "v@x.com" }],
    links: [{ id: "l1", label: "Site", value: "x.com" }],
    contactName: "Li",
    contactRole: "Gerente",
    contactLanguage: "EN",
    moq: "500",
    priceFob: "USD 2.00",
    leadTime: "30d",
    paymentTerms: "30/70",
    incoterm: "FOB",
    notes: "negociação antiga",
    groupIds: ["g1", "g2"],
  };
}

let counter = 0;
const fakeGenId = () => `new-contact-${++counter}`;

describe("buildDuplicatePayload", () => {
  it("copia os dados de cadastro (nome com sufixo, contatos, localização)", () => {
    const src = makeSource();
    const out = buildDuplicatePayload(src, fakeGenId, { nameSuffix: "(Aquário)" });
    expect(out.name).toBe("Guangzhou Jiarong (Aquário)");
    expect(out.chineseName).toBe(src.chineseName);
    expect(out.category).toBe(src.category);
    expect(out.city).toBe(src.city);
    expect(out.province).toBe(src.province);
    expect(out.district).toBe(src.district);
    expect(out.contactName).toBe(src.contactName);
  });

  it("zera os dados de negociação-base (moq, preço, lead time, etc.)", () => {
    const out = buildDuplicatePayload(makeSource(), fakeGenId);
    expect(out.moq).toBeUndefined();
    expect(out.priceFob).toBeUndefined();
    expect(out.leadTime).toBeUndefined();
    expect(out.paymentTerms).toBeUndefined();
    expect(out.incoterm).toBeUndefined();
    expect(out.notes).toBeUndefined();
  });

  it("zera os grupos (vínculo é por negociação)", () => {
    const out = buildDuplicatePayload(makeSource(), fakeGenId);
    expect(out.groupIds).toEqual([]);
  });

  it("gera NOVOS ids de contato, preservando label/valor", () => {
    counter = 0;
    const src = makeSource();
    const out = buildDuplicatePayload(src, fakeGenId);
    expect(out.phones[0].id).not.toBe(src.phones[0].id);
    expect(out.phones[0].value).toBe(src.phones[0].value);
    expect(out.phones[0].label).toBe(src.phones[0].label);
    expect(out.emails[0].id).not.toBe(src.emails[0].id);
    expect(out.links[0].id).not.toBe(src.links[0].id);
  });

  it("não inclui id/scope/createdAt/updatedAt (gerados pelo create)", () => {
    const out = buildDuplicatePayload(makeSource(), fakeGenId) as Record<string, unknown>;
    expect(out.id).toBeUndefined();
    expect(out.scope).toBeUndefined();
    expect(out.createdAt).toBeUndefined();
    expect(out.updatedAt).toBeUndefined();
  });

  it("mantém o nome original quando não há sufixo", () => {
    const out = buildDuplicatePayload(makeSource(), fakeGenId);
    expect(out.name).toBe("Guangzhou Jiarong");
  });

  it("lida com listas de contato ausentes (arrays vazios)", () => {
    const src = makeSource();
    // @ts-expect-error simulando dado legado sem arrays
    src.phones = undefined;
    const out = buildDuplicatePayload(src, fakeGenId);
    expect(out.phones).toEqual([]);
  });

  it("não muta o fornecedor de origem", () => {
    const src = makeSource();
    const before = JSON.stringify(src);
    buildDuplicatePayload(src, fakeGenId, { nameSuffix: "(Terrário)" });
    expect(JSON.stringify(src)).toBe(before);
  });
});
