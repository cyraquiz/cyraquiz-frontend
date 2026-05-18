// Run once: node scripts/generate-avatars.js
// Generates 12 static SVG avatar files into public/avatars/
// This removes the DiceBear runtime dependency from the browser bundle.

import { createAvatar } from "@dicebear/core";
import * as avataaars from "@dicebear/avataaars-neutral";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/avatars");

mkdirSync(OUT_DIR, { recursive: true });

const CONFIGS = [
  { id: "A", bg: "E74C3C", eyes: "happy",      brows: "raisedExcitedNatural", mouth: "smile"      },
  { id: "B", bg: "3498DB", eyes: "hearts",     brows: "defaultNatural",       mouth: "twinkle"    },
  { id: "C", bg: "2ECC71", eyes: "squint",     brows: "flatNatural",          mouth: "tongue"     },
  { id: "D", bg: "9B59B6", eyes: "wink",       brows: "raisedExcited",        mouth: "eating"     },
  { id: "E", bg: "F39C12", eyes: "winkWacky",  brows: "angryNatural",         mouth: "disbelief"  },
  { id: "F", bg: "16A085", eyes: "eyeRoll",    brows: "upDownNatural",        mouth: "serious"    },
  { id: "G", bg: "E91E63", eyes: "surprised",  brows: "sadConcernedNatural",  mouth: "concerned"  },
  { id: "H", bg: "27AE60", eyes: "closed",     brows: "unibrowNatural",       mouth: "smile"      },
  { id: "I", bg: "D35400", eyes: "side",       brows: "default",              mouth: "tongue"     },
  { id: "J", bg: "8E44AD", eyes: "default",    brows: "frownNatural",         mouth: "twinkle"    },
  { id: "K", bg: "0097A7", eyes: "happy",      brows: "flatNatural",          mouth: "eating"     },
  { id: "L", bg: "C0392B", eyes: "squint",     brows: "defaultNatural",       mouth: "disbelief"  },
];

for (const { id, bg, eyes, brows, mouth } of CONFIGS) {
  const svg = createAvatar(avataaars, {
    seed:            id,
    size:            80,
    backgroundColor: [bg],
    eyes:            [eyes],
    eyebrows:        [brows],
    mouth:           [mouth],
  }).toString();

  writeFileSync(join(OUT_DIR, `${id}.svg`), svg, "utf8");
  console.log(`✓ avatar-${id}.svg`);
}

console.log(`\nDone — ${CONFIGS.length} avatars written to public/avatars/`);
