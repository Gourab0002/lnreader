import { ChapterItem } from '@plugins/types';

export interface ExistingChapterIdentity {
  id: number;
  path: string;
  name: string;
  chapterNumber: number | null;
  scanlator: string | null;
}

const chapterIdentity = (
  name: string,
  chapterNumber: number | null | undefined,
  scanlator: string | null,
) => `${name.trim()}\0${chapterNumber ?? ''}\0${scanlator ?? ''}`;

const scanlatorOf = (scanlator: ChapterItem['scanlator']) => {
  if (!scanlator) {
    return null;
  }
  if (Array.isArray(scanlator)) {
    const joined = scanlator.filter(Boolean).join(', ');
    return joined || null;
  }
  return scanlator;
};

const oldest = (
  current: ExistingChapterIdentity,
  row: ExistingChapterIdentity,
) => (row.id < current.id ? row : current);

export interface ChapterPathRebind {
  id: number;
  path: string;
}

export interface StabilizedChapters {
  chapters: ChapterItem[];
  rebinds: ChapterPathRebind[];
}

const unchanged = (chapters: ChapterItem[]): StabilizedChapters => ({
  chapters,
  rebinds: [],
});

/**
 * Sources sometimes mint a new chapter URL on every library update. One-shots
 * then gain another copy of the same chapter, and longer novels can do the
 * same when only the URL changed. Rebind the stored row onto the new URL when
 * the title (and, for multi-chapter novels, the number and scanlator) already
 * exist, so the update revises that row instead of inserting another one.
 */
export const stabilizeChapterPaths = (
  existing: ExistingChapterIdentity[],
  chapters: ChapterItem[],
): StabilizedChapters => {
  if (!existing.length || !chapters.length) {
    return unchanged(chapters);
  }

  const incoming = chapters[0];
  const incomingName = (incoming.name || 'Chapter 1').trim();
  if (
    chapters.length === 1 &&
    incomingName &&
    !existing.some(row => row.path === incoming.path) &&
    existing.every(row => row.name.trim() === incomingName)
  ) {
    const keeper = existing.reduce(oldest);
    return {
      chapters,
      rebinds: [{ id: keeper.id, path: incoming.path }],
    };
  }

  const existingPaths = new Set(existing.map(chapter => chapter.path));
  const claimed = new Set<number>();
  for (const chapter of chapters) {
    const match = existing.find(row => row.path === chapter.path);
    if (match) {
      claimed.add(match.id);
    }
  }

  const groups = new Map<string, ExistingChapterIdentity[]>();
  for (const row of existing) {
    if (claimed.has(row.id)) {
      continue;
    }
    const key = chapterIdentity(row.name, row.chapterNumber, row.scanlator);
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  const rebinds: ChapterPathRebind[] = [];
  const stableChapters = chapters.map((chapter, index) => {
    if (existingPaths.has(chapter.path)) {
      return chapter;
    }

    const name = chapter.name || `Chapter ${index + 1}`;
    const key = chapterIdentity(
      name,
      chapter.chapterNumber ?? index + 1,
      scanlatorOf(chapter.scanlator),
    );
    const group = groups.get(key);
    if (!group?.length) {
      return chapter;
    }

    const keeper = group.reduce(oldest);
    groups.set(
      key,
      group.filter(row => row.id !== keeper.id),
    );
    rebinds.push({ id: keeper.id, path: chapter.path });
    return chapter;
  });

  return { chapters: stableChapters, rebinds };
};
