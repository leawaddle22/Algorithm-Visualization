export function parseArrayInput(input, minimumLength = 2, maximumLength = 14) {
  const entries = input.split(',').map((entry) => entry.trim());
  const values = entries.map(Number);

  if (
    entries.length < minimumLength
    || entries.length > maximumLength
    || entries.some((entry) => entry === '')
    || values.some((value) => !Number.isFinite(value))
  ) {
    return {
      values: null,
      error: `Enter ${minimumLength}-${maximumLength} finite numbers separated by commas.`
    };
  }

  return { values, error: '' };
}

export function formatArray(values) {
  return `[${values.join(', ')}]`;
}
