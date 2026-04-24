/**
 * Replaces the home directory prefix with ~ and collapses middle segments,
 * keeping the immediate parent folder and filename visible.
 * e.g. /home/lukas/research/genes/study.txt → ~/…/genes/study.txt
 */
export function shortenPath(path: string, home: string): string {
    const relative = path.replace(home, '~');
    const parts = relative.split(/[/\\]/);
    if (parts.length <= 3) return relative;
    return `${parts[0]}/…/${parts.at(-2)}/${parts.at(-1)}`;
}
