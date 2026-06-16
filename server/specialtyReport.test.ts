import { describe, it, expect } from "vitest";
import {
  resolveSpecialty,
  matchesSpecialty,
  filterEntriesBySpecialty,
  countBySpecialty,
  type SpecialtyEntryLike,
} from "../client/src/shared/supplier-notes/specialtyReport";

const subtipoById: Record<string, string | undefined> = {
  s1: "aquario", // marcado no Diário como aquário
  s2: "terrario", // marcado no Diário como terrário
  // s3 sem marcação -> cai na categoria
  // s4 sem marcação -> cai na categoria
};

const categoryById: Record<string, string | undefined> = {
  s1: "terrario", // categoria original conflita, mas o Diário tem prioridade
  s2: "aquario", // idem
  s3: "aquario", // sem marcação -> aquário pela categoria
  s4: "terrario", // sem marcação -> terrário pela categoria
  s5: "equipamento", // categoria que não é aquário nem terrário -> outros
};

describe("resolveSpecialty", () => {
  it("prioriza o subtipo marcado no Diário sobre a categoria original", () => {
    expect(resolveSpecialty("s1", subtipoById, categoryById)).toBe("aquario");
    expect(resolveSpecialty("s2", subtipoById, categoryById)).toBe("terrario");
  });

  it("usa a categoria original quando não há subtipo marcado", () => {
    expect(resolveSpecialty("s3", subtipoById, categoryById)).toBe("aquario");
    expect(resolveSpecialty("s4", subtipoById, categoryById)).toBe("terrario");
  });

  it("classifica categorias não-pet como 'outros'", () => {
    expect(resolveSpecialty("s5", subtipoById, categoryById)).toBe("outros");
  });

  it("retorna 'outros' para id desconhecido (sem subtipo e sem categoria)", () => {
    expect(resolveSpecialty("zzz", subtipoById, categoryById)).toBe("outros");
  });
});

describe("matchesSpecialty", () => {
  it("'todos' mantém qualquer fornecedor", () => {
    expect(matchesSpecialty("s5", "todos", subtipoById, categoryById)).toBe(true);
    expect(matchesSpecialty("zzz", "todos", subtipoById, categoryById)).toBe(true);
  });

  it("filtra corretamente por aquário", () => {
    expect(matchesSpecialty("s1", "aquario", subtipoById, categoryById)).toBe(true);
    expect(matchesSpecialty("s3", "aquario", subtipoById, categoryById)).toBe(true);
    expect(matchesSpecialty("s2", "aquario", subtipoById, categoryById)).toBe(false);
    expect(matchesSpecialty("s5", "aquario", subtipoById, categoryById)).toBe(false);
  });

  it("filtra corretamente por terrário", () => {
    expect(matchesSpecialty("s2", "terrario", subtipoById, categoryById)).toBe(true);
    expect(matchesSpecialty("s4", "terrario", subtipoById, categoryById)).toBe(true);
    expect(matchesSpecialty("s1", "terrario", subtipoById, categoryById)).toBe(false);
  });

  it("'outros' (equipamentos) não aparece em aquário nem terrário", () => {
    expect(matchesSpecialty("s5", "aquario", subtipoById, categoryById)).toBe(false);
    expect(matchesSpecialty("s5", "terrario", subtipoById, categoryById)).toBe(false);
  });
});

describe("filterEntriesBySpecialty", () => {
  const entries: SpecialtyEntryLike[] = [
    { supplierId: "s1" },
    { supplierId: "s2" },
    { supplierId: "s3" },
    { supplierId: "s4" },
    { supplierId: "s5" },
  ];

  it("'todos' não remove nada", () => {
    expect(filterEntriesBySpecialty(entries, "todos", subtipoById, categoryById)).toHaveLength(5);
  });

  it("aquário mantém apenas s1 e s3", () => {
    const out = filterEntriesBySpecialty(entries, "aquario", subtipoById, categoryById);
    expect(out.map((e) => e.supplierId).sort()).toEqual(["s1", "s3"]);
  });

  it("terrário mantém apenas s2 e s4", () => {
    const out = filterEntriesBySpecialty(entries, "terrario", subtipoById, categoryById);
    expect(out.map((e) => e.supplierId).sort()).toEqual(["s2", "s4"]);
  });
});

describe("countBySpecialty", () => {
  it("conta corretamente cada especialidade", () => {
    const entries: SpecialtyEntryLike[] = [
      { supplierId: "s1" },
      { supplierId: "s2" },
      { supplierId: "s3" },
      { supplierId: "s4" },
      { supplierId: "s5" },
    ];
    const counts = countBySpecialty(entries, subtipoById, categoryById);
    expect(counts).toEqual({ aquario: 2, terrario: 2, outros: 1 });
  });

  it("lista vazia retorna zeros", () => {
    expect(countBySpecialty([], subtipoById, categoryById)).toEqual({
      aquario: 0,
      terrario: 0,
      outros: 0,
    });
  });
});
