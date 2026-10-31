// Pure, deterministic Tidebite pacing rules. No user tracking or network calls.
export const TIDE_LENGTH = 75;
export function tideNumber(seconds) {
  const t = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return Math.floor(t / TIDE_LENGTH) + 1;
}
export function secondsToNextTide(seconds) {
  const t = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return Math.max(1, Math.ceil(TIDE_LENGTH - (t % TIDE_LENGTH)));
}
// Keep edible prey and clearly dangerous predators available as the player grows.
// The gap between them is intentional: touching an almost-equal fish does nothing.
export function fishRadiusRange(playerRadius, seconds, roll) {
  const hero = Math.max(21, Math.min(86, Number.isFinite(playerRadius) ? playerRadius : 21));
  const wave = tideNumber(seconds);
  const preyMax = Math.min(hero * .86, 18 + (wave - 1) * 2.5 + (hero - 21) * .75);
  if (roll < .70) return [Math.max(8, preyMax * .58), preyMax];
  const predatorMin = Math.max(hero * 1.23, 29);
  const predatorMax = Math.max(predatorMin + 8, Math.min(126, 52 + (wave - 1) * 9 + hero * .65));
  return [predatorMin, predatorMax];
}
