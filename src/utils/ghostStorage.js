const GHOST_KEY = "cyraquiz_ghost_saves";
const MAX_SAVES  = 10;

function monthLabel(d) {
  return ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][d.getMonth()];
}

export function loadGhostSaves() {
  try { return JSON.parse(localStorage.getItem(GHOST_KEY) || "[]"); }
  catch { return []; }
}

export function saveGhostGame(questions) {
  if (!Array.isArray(questions) || questions.length < 2) return;
  const saves = loadGhostSaves();
  const now = new Date();
  const save = {
    id: crypto.randomUUID(),
    savedAt: Date.now(),
    title: `Quiz del ${now.getDate()} ${monthLabel(now)}`,
    questionCount: questions.length,
    questions: questions.map(q => ({
      type:     q.type    || "single",
      question: q.question || "",
      options:  Array.isArray(q.options) ? [...q.options] : [],
      answer:   q.answer,
      time:     q.time    || 20,
      points:   q.points  || 100,
      min:      q.min     ?? 0,
      max:      q.max     ?? 100,
    })),
    bestScore: null,
    attempts:  [],
  };
  saves.unshift(save);
  localStorage.setItem(GHOST_KEY, JSON.stringify(saves.slice(0, MAX_SAVES)));
}

export function addGhostAttempt(saveId, score, total) {
  const saves = loadGhostSaves();
  const save  = saves.find(s => s.id === saveId);
  if (!save) return;
  save.attempts.push({ date: Date.now(), score, total });
  save.bestScore = Math.max(...save.attempts.map(a => a.score));
  localStorage.setItem(GHOST_KEY, JSON.stringify(saves));
}

export function deleteGhostSave(saveId) {
  const saves = loadGhostSaves().filter(s => s.id !== saveId);
  localStorage.setItem(GHOST_KEY, JSON.stringify(saves));
}

export function checkAnswer(q, given) {
  if (q.type === "poll" || q.type === "scale") return { isCorrect: true, points: 0 };
  if (q.type === "multi") {
    const correct = Array.isArray(q.answer) ? [...q.answer].sort() : [];
    const userSorted = Array.isArray(given) ? [...given].sort() : [];
    const ok = correct.length === userSorted.length && correct.every((v, i) => v === userSorted[i]);
    return { isCorrect: ok, points: ok ? (q.points || 0) : 0 };
  }
  if (q.type === "text") {
    const ok = String(given).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
    return { isCorrect: ok, points: ok ? (q.points || 0) : 0 };
  }
  const ok = String(given) === String(q.answer);
  return { isCorrect: ok, points: ok ? (q.points || 0) : 0 };
}
