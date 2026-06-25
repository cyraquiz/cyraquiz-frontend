import { describe, it, expect } from "vitest";
import { checkAnswer } from "./ghostStorage";

describe("checkAnswer", () => {
  // ── single / tf ───────────────────────────────────────
  describe("type: single", () => {
    const q = { type: "single", answer: "París", points: 200 };

    it("devuelve correcto cuando la respuesta coincide", () => {
      expect(checkAnswer(q, "París")).toEqual({ isCorrect: true, points: 200 });
    });

    it("devuelve incorrecto cuando la respuesta no coincide", () => {
      expect(checkAnswer(q, "Madrid")).toEqual({ isCorrect: false, points: 0 });
    });

    it("compara como string (números)", () => {
      const qNum = { type: "single", answer: "42", points: 100 };
      expect(checkAnswer(qNum, 42)).toEqual({ isCorrect: true, points: 100 });
    });
  });

  // ── multi ─────────────────────────────────────────────
  describe("type: multi", () => {
    const q = { type: "multi", answer: ["B", "D"], points: 300 };

    it("correcto con orden igual", () => {
      expect(checkAnswer(q, ["B", "D"])).toEqual({ isCorrect: true, points: 300 });
    });

    it("correcto con orden diferente (sort interno)", () => {
      expect(checkAnswer(q, ["D", "B"])).toEqual({ isCorrect: true, points: 300 });
    });

    it("incorrecto si falta una opción", () => {
      expect(checkAnswer(q, ["B"])).toEqual({ isCorrect: false, points: 0 });
    });

    it("incorrecto si hay opción extra", () => {
      expect(checkAnswer(q, ["B", "D", "A"])).toEqual({ isCorrect: false, points: 0 });
    });

    it("incorrecto si la respuesta no es array", () => {
      expect(checkAnswer(q, "B")).toEqual({ isCorrect: false, points: 0 });
    });
  });

  // ── text ──────────────────────────────────────────────
  describe("type: text", () => {
    const q = { type: "text", answer: "React", points: 150 };

    it("correcto con texto exacto", () => {
      expect(checkAnswer(q, "React")).toEqual({ isCorrect: true, points: 150 });
    });

    it("case-insensitive", () => {
      expect(checkAnswer(q, "react")).toEqual({ isCorrect: true, points: 150 });
      expect(checkAnswer(q, "REACT")).toEqual({ isCorrect: true, points: 150 });
    });

    it("ignora espacios al inicio y al final", () => {
      expect(checkAnswer(q, "  React  ")).toEqual({ isCorrect: true, points: 150 });
    });

    it("incorrecto con texto diferente", () => {
      expect(checkAnswer(q, "Vue")).toEqual({ isCorrect: false, points: 0 });
    });
  });

  // ── poll / scale ──────────────────────────────────────
  describe("type: poll y scale", () => {
    it("poll siempre es correcto con 0 puntos", () => {
      const q = { type: "poll", answer: "A", points: 100 };
      expect(checkAnswer(q, "A")).toEqual({ isCorrect: true, points: 0 });
      expect(checkAnswer(q, "B")).toEqual({ isCorrect: true, points: 0 });
    });

    it("scale siempre es correcto con 0 puntos", () => {
      const q = { type: "scale", answer: "3", points: 100 };
      expect(checkAnswer(q, "1")).toEqual({ isCorrect: true, points: 0 });
    });
  });

  // ── edge cases ────────────────────────────────────────
  describe("casos límite", () => {
    it("tipo desconocido usa comparación string", () => {
      const q = { type: "custom", answer: "X", points: 50 };
      expect(checkAnswer(q, "X")).toEqual({ isCorrect: true, points: 50 });
    });

    it("respuesta undefined es incorrecto en single", () => {
      const q = { type: "single", answer: "A", points: 100 };
      expect(checkAnswer(q, undefined)).toEqual({ isCorrect: false, points: 0 });
    });

    it("multi con array vacío de answer devuelve correcto para array vacío dado", () => {
      const q = { type: "multi", answer: [], points: 100 };
      expect(checkAnswer(q, [])).toEqual({ isCorrect: true, points: 100 });
    });
  });
});
