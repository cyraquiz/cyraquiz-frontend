import { createAvatar } from "@dicebear/core";
import * as adventurer  from "@dicebear/adventurer";

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

// Pre-generate all SVG data URIs once at module load — zero HTTP requests
const cache = new Map();

export function getAvatarSrc(seed) {
  if (!cache.has(seed)) {
    cache.set(seed, createAvatar(adventurer, { seed, size: 80 }).toDataUri());
  }
  return cache.get(seed);
}
