import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock do invokeLLM para não chamar a rede nos testes. Devolve uma "tradução"
// determinística: prefixa "PT:" mantendo o índice de cada item recebido.
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async ({ messages }: { messages: Array<{ role: string; content: string }> }) => {
    const userMsg = messages.find((m) => m.role === "user");
    const payload = JSON.parse(userMsg?.content ?? "{}") as {
      items: Array<{ index: number; text: string }>;
    };
    const items = payload.items.map((it) => ({ index: it.index, pt: `PT:${it.text}` }));
    return { choices: [{ message: { content: JSON.stringify({ items }) } }] };
  }),
}));

import { hasChinese, translateTexts } from "./translate";
import { invokeLLM } from "./_core/llm";

describe("hasChinese", () => {
  it("detecta caracteres chineses (Han)", () => {
    expect(hasChinese("产品型号")).toBe(true);
    expect(hasChinese("RS-01A 长")).toBe(true);
  });
  it("retorna false para texto sem chinês", () => {
    expect(hasChinese("RS-01A")).toBe(false);
    expect(hasChinese("6.8")).toBe(false);
    expect(hasChinese("")).toBe(false);
  });
});

describe("translateTexts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mantém o mesmo tamanho e ordem da entrada", async () => {
    const input = ["鱼缸刷子", "RS-01A", "加热棒", "6.8"];
    const out = await translateTexts(input);
    expect(out).toHaveLength(input.length);
    // itens sem chinês permanecem idênticos
    expect(out[1]).toBe("RS-01A");
    expect(out[3]).toBe("6.8");
    // itens chineses foram traduzidos
    expect(out[0]).toBe("PT:鱼缸刷子");
    expect(out[2]).toBe("PT:加热棒");
  });

  it("não chama o LLM quando não há chinês", async () => {
    const out = await translateTexts(["RS-01A", "6.8", "60"]);
    expect(out).toEqual(["RS-01A", "6.8", "60"]);
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("deduplica e usa cache em chamadas repetidas", async () => {
    // termo único deste teste para não colidir com o cache de módulo de outros casos
    const term = "植物养殖杯";
    await translateTexts([term, term, term]);
    // primeira chamada traduz o termo uma única vez (deduplicado)
    expect(invokeLLM).toHaveBeenCalledTimes(1);
    // segunda chamada para o mesmo texto vem do cache, sem nova chamada
    const out = await translateTexts([term]);
    expect(out[0]).toBe(`PT:${term}`);
    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });
});
