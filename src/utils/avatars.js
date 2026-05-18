const SEEDS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export const AVATAR_SEEDS = SEEDS;

export function getAvatarSrc(seed) {
  if (SEEDS.includes(seed)) return `/avatars/${seed}.svg`;
  // Unknown seed — fallback to first avatar
  return `/avatars/A.svg`;
}
