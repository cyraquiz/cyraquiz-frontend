import { createAvatar } from "@dicebear/core";
import * as avataaars    from "@dicebear/avataaars-neutral";

export const AVATAR_SEEDS = [
  "micky", "minnie", "pato", "goofy", "pluto",
  "bella", "cenicienta", "blanca", "durmiente",
  "mulan", "sirenita", "jasmine", "tiana", "merida",
  "rapunzel", "moana", "woody", "buzz", "marciano",
  "rayo", "mate", "nemo", "dory", "baymax", "sulley",
  "mike", "groot", "rocket", "spider", "iron",
  "hulk", "capitan", "viuda", "thor", "doctor",
  "wanda", "loki", "thanos", "harry", "hermione",
  "ron", "luna", "dum", "snape", "vold", "dobby",
  "hed", "buck",
];

// 16-color vibrant palette — assigned by index so adjacent slots never repeat
const BG = [
  "E74C3C", "3498DB", "2ECC71", "9B59B6",
  "F39C12", "1ABC9C", "E91E63", "2980B9",
  "D35400", "27AE60", "8BC34A", "673AB7",
  "C0392B", "16A085", "F1C40F", "8E44AD",
];

// Curated pools — DiceBear picks one per seed, giving face variety
const EYES = ["closed", "default", "happy", "hearts", "side", "squint", "surprised", "wink", "winkWacky", "eyeRoll"];
const BROWS = ["angryNatural", "defaultNatural", "flatNatural", "raisedExcitedNatural", "upDownNatural", "default", "raisedExcited", "sadConcernedNatural"];
const MOUTHS = ["default", "smile", "twinkle", "tongue", "eating", "concerned", "serious", "disbelief"];

const cache = new Map();

export function getAvatarSrc(seed) {
  if (!cache.has(seed)) {
    const idx = AVATAR_SEEDS.indexOf(seed);
    // For unknown seeds (e.g. player name as fallback), derive color from string hash
    const colorIdx = idx >= 0
      ? idx % BG.length
      : Math.abs([...seed].reduce((h, c) => h * 31 + c.charCodeAt(0), 0)) % BG.length;

    cache.set(seed, createAvatar(avataaars, {
      seed,
      size: 80,
      backgroundColor: [BG[colorIdx]],
      eyes:       EYES,
      eyebrows:   BROWS,
      mouth:      MOUTHS,
    }).toDataUri());
  }
  return cache.get(seed);
}
