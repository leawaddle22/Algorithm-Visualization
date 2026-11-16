const START_DELAY = 320;
const JUMP_DURATION = 420;
const BETWEEN_JUMPS_DELAY = 90;
const JUMP_HEIGHT = 0.42;

export function createCompletionAnimation() {
  let bars = [];
  let basePositions = [];
  let phase = 'idle';
  let elapsed = 0;
  let index = 0;

  function cancel() {
    bars = [];
    basePositions = [];
    phase = 'idle';
    elapsed = 0;
    index = 0;
  }

  function start(nextBars) {
    if (phase !== 'idle') return false;

    bars = nextBars.slice();
    basePositions = bars.map((bar) => bar.position.y);
    phase = bars.length ? 'delay' : 'done';
    elapsed = 0;
    index = 0;
    return true;
  }

  function update(delta, speed = 1) {
    let remaining = delta * speed;

    while (remaining > 0 && phase !== 'idle' && phase !== 'done') {
      if (phase === 'delay' || phase === 'gap') {
        const duration = phase === 'delay' ? START_DELAY : BETWEEN_JUMPS_DELAY;
        const timeLeft = duration - elapsed;
        if (remaining < timeLeft) {
          elapsed += remaining;
          break;
        }

        remaining -= timeLeft;
        elapsed = 0;
        phase = 'jump';
        continue;
      }

      const jumpElapsed = elapsed + remaining;
      const progress = Math.min(jumpElapsed / JUMP_DURATION, 1);
      bars[index].position.y = basePositions[index] + Math.sin(progress * Math.PI) * JUMP_HEIGHT;

      if (progress < 1) {
        elapsed = jumpElapsed;
        break;
      }

      bars[index].position.y = basePositions[index];
      remaining = Math.max(0, jumpElapsed - JUMP_DURATION);
      index += 1;
      elapsed = 0;
      phase = index === bars.length ? 'done' : 'gap';
    }
  }

  return { start, update, cancel };
}
