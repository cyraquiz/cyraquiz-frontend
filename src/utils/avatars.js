import { createAvatar } from "@dicebear/core";
import * as avataaars    from "@dicebear/avataaars-neutral";

// 12 hand-crafted avatars — each unique combination of bg + eyes + brows + mouth
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

// Pre-generate all 12 at module load — zero work when the modal opens
const AVATAR_MAP = new Map(
  CONFIGS.map(({ id, bg, eyes, brows, mouth }) => [
    id,
    createAvatar(avataaars, {
      seed:            id,
      size:            80,
      backgroundColor: [bg],
      eyes:            [eyes],
      eyebrows:        [brows],
      mouth:           [mouth],
    }).toDataUri(),
  ])
);

export const AVATAR_SEEDS = CONFIGS.map(c => c.id);

export function getAvatarSrc(seed) {
  if (AVATAR_MAP.has(seed)) return AVATAR_MAP.get(seed);
  // Fallback for player names received over socket
  return createAvatar(avataaars, { seed, size: 80 }).toDataUri();
}
