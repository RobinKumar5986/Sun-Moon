import { LEVEL_BASIC, LEVEL_TRIAL } from './solver.js';

export const TIER_NORMAL = 'normal';
export const TIER_HARD = 'hard';
export const TIER_SUPER = 'super';

const SIGNS_FROM_STAGE = 8;

const lerp = (a, b, t) => a + (b - a) * t;

export function stageTier(stage) {
  if (stage >= 10 && stage % 10 === 0) return TIER_SUPER;
  if (stage >= 5 && stage % 5 === 0) return TIER_HARD;
  return TIER_NORMAL;
}

export function stageConfig(stage) {
  const tier = stageTier(stage);
  const ease = 1 - Math.exp(-(stage - 1) / 50);
  const isRelief = stage > 5 && stage % 5 === 1;

  if (stage <= 3) {
    return { stage, tier, size: 4, maxLevel: LEVEL_BASIC, targetGivens: [8, 6, 5][stage - 1], signCount: 0 };
  }

  let size = 6;
  if (tier === TIER_SUPER && stage >= 30) size = 8;
  if (tier === TIER_HARD && stage >= 75) size = 8;
  if (tier === TIER_NORMAL && stage >= 120 && stage % 3 === 0) size = 8;

  const cells = size * size;
  let givenRatio = lerp(0.5, 0.2, ease);
  let signRatio = stage < SIGNS_FROM_STAGE ? 0 : lerp(0.22, 0.17, ease);
  let maxLevel = stage >= 14 ? LEVEL_TRIAL : LEVEL_BASIC;

  if (tier === TIER_HARD) {
    givenRatio *= 0.7;
    maxLevel = LEVEL_TRIAL;
  } else if (tier === TIER_SUPER) {
    givenRatio = 0;
    signRatio *= 0.85;
    maxLevel = LEVEL_TRIAL;
  } else if (isRelief) {
    givenRatio *= 1.3;
    maxLevel = LEVEL_BASIC;
  }

  return {
    stage,
    tier,
    size,
    maxLevel,
    targetGivens: Math.round(cells * givenRatio),
    signCount: Math.round(cells * signRatio),
  };
}
