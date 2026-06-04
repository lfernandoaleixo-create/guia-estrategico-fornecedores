import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do storagePut: não bate no S3 real durante o teste, apenas devolve uma
// referência previsível e registra o tamanho do buffer recebido.
const putSpy = vi.fn(async (relKey: string, data: Buffer | Uint8Array | string) => {
  const size = typeof data === "string" ? Buffer.byteLength(data) : (data as Buffer).length;
  return { key: `${relKey}__stored`, url: `/manus-storage/${relKey}__stored`, __size: size };
});

vi.mock("./storage", () => ({
  storagePut: (relKey: string, data: Buffer | Uint8Array | string, contentType?: string) =>
    putSpy(relKey, data, contentType as any),
}));

import { sanitizeAttachmentsJson, sanitizeQuoteRows } from "./sanitizeNote";

const PNG_1PX_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

beforeEach(() => {
  putSpy.mockClear();
});

describe("sanitizeAttachmentsJson", () => {
  it("converte anexo com dataUrl base64 em url/fileKey e remove o base64", async () => {
    const attachments = JSON.stringify([
      {
        id: "a1",
        name: "catalogo.png",
        type: "image/png",
        category: "catalogos",
        dataUrl: `data:image/png;base64,${PNG_1PX_BASE64}`,
      },
    ]);

    const out = await sanitizeAttachmentsJson("aquario", "sup1", attachments);
    const parsed = JSON.parse(out);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].dataUrl).toBeUndefined();
    expect(parsed[0].url).toContain("/manus-storage/");
    expect(parsed[0].fileKey).toBeTruthy();
    // metadados preservados
    expect(parsed[0].name).toBe("catalogo.png");
    expect(parsed[0].category).toBe("catalogos");
    expect(putSpy).toHaveBeenCalledTimes(1);
  });

  it("mantém anexos já migrados (com url, sem dataUrl) sem subir nada", async () => {
    const attachments = JSON.stringify([
      { id: "a2", name: "doc.pdf", url: "/manus-storage/x.pdf", fileKey: "x.pdf" },
    ]);

    const out = await sanitizeAttachmentsJson("aquario", "sup1", attachments);
    const parsed = JSON.parse(out);

    expect(parsed[0].url).toBe("/manus-storage/x.pdf");
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("retorna '[]' para entradas inválidas", async () => {
    expect(await sanitizeAttachmentsJson("s", "i", null)).toBe("[]");
    expect(await sanitizeAttachmentsJson("s", "i", "não-json")).toBe("[]");
    expect(await sanitizeAttachmentsJson("s", "i", JSON.stringify({}))).toBe("[]");
  });
});

describe("sanitizeQuoteRows", () => {
  it("preserva campos de texto e migra anexos base64 embutidos", async () => {
    const rows = [
      {
        id: "q1",
        produto: "Fibra de algodão",
        precoFob: "US$ 2,10/kg",
        anexo: {
          id: "f1",
          name: "cotacao.pdf",
          type: "application/pdf",
          dataUrl: `data:application/pdf;base64,${PNG_1PX_BASE64}`,
        },
      },
    ];

    const out = (await sanitizeQuoteRows("aquario", "sup1", rows)) as any[];

    expect(out[0].produto).toBe("Fibra de algodão");
    expect(out[0].precoFob).toBe("US$ 2,10/kg");
    expect(out[0].anexo.dataUrl).toBeUndefined();
    expect(out[0].anexo.url).toContain("/manus-storage/");
    expect(putSpy).toHaveBeenCalledTimes(1);
  });

  it("passa null/undefined adiante sem erro", async () => {
    expect(await sanitizeQuoteRows("s", "i", null)).toBeNull();
    expect(await sanitizeQuoteRows("s", "i", undefined)).toBeUndefined();
  });
});
