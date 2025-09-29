/**
 * Class name utility for merging Tailwind classes
 * Implements the same algorithm as clsx for production-quality class merging
 */
export function cn(...inputs) {
  let str = '';

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];

    if (!input) continue;

    if (typeof input === 'string') {
      str && (str += ' ');
      str += input;
    } else if (typeof input === 'object') {
      if (Array.isArray(input)) {
        const inner = cn(...input);
        if (inner) {
          str && (str += ' ');
          str += inner;
        }
      } else {
        for (const key in input) {
          if (input[key]) {
            str && (str += ' ');
            str += key;
          }
        }
      }
    }
  }

  return str;
}