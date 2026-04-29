/**
 * Wrap a label into at most `maxLines` lines of at most `maxChars` characters,
 * breaking on word boundaries when possible and hard-cutting words that are
 * longer than a single line. If the input does not fit, the last line ends
 * with an ellipsis.
 */
export function wrapLabel(label: string, maxChars = 10, maxLines = 2): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  let i = 0;

  while (i < words.length && lines.length < maxLines) {
    const w = words[i];
    if (!cur) {
      if (w.length > maxChars) {
        cur = w.slice(0, maxChars);
        words[i] = w.slice(maxChars);
      } else {
        cur = w;
        i++;
      }
    } else if ((cur + ' ' + w).length <= maxChars) {
      cur = cur + ' ' + w;
      i++;
    } else {
      lines.push(cur);
      cur = '';
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);

  if (i < words.length || words[i - 1]?.length > maxChars) {
    const last = lines[lines.length - 1] ?? '';
    lines[lines.length - 1] = last.length >= maxChars
      ? last.slice(0, maxChars - 1).trimEnd() + '…'
      : last.trimEnd() + '…';
  }
  return lines.length ? lines : [''];
}
