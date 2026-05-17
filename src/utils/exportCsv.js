/**
 * Genera y descarga un CSV con los resultados finales de una partida.
 * El BOM UTF-8 (﻿) asegura que Excel abra tildes y ñ correctamente.
 */
export function exportResultsCSV(players, quizTitle = "partida") {
  if (!players || players.length === 0) return;

  const header = "Posición,Jugador,Puntaje,Tiempo promedio (s)";
  const rows = players.map((p, i) => {
    const name = `"${String(p.name).replace(/"/g, '""')}"`;
    const time = p.timeAccumulated > 0
      ? (p.timeAccumulated / 1000).toFixed(2)
      : "—";
    return `${i + 1},${name},${p.score},${time}`;
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);

  const filename = quizTitle
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .slice(0, 60)
    .trim() || "partida";

  const anchor = document.createElement("a");
  anchor.href     = url;
  anchor.download = `${filename}_resultados.csv`;
  anchor.click();

  URL.revokeObjectURL(url);
}
