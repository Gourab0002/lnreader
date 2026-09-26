import { stabilizeChapterPaths } from '../stabilizeChapterPaths';

const stored = (
  id: number,
  path: string,
  name: string,
  chapterNumber: number | null = 1,
  scanlator: string | null = null,
) => ({
  id,
  path,
  name,
  chapterNumber,
  scanlator,
});

describe('stabilizeChapterPaths', () => {
  it('moves a one-shot onto the new URL instead of copying it', () => {
    const { chapters, rebinds } = stabilizeChapterPaths(
      [
        stored(3, '/story/old', 'One Shot'),
        stored(8, '/story/newer', 'One Shot'),
      ],
      [{ name: 'One Shot', path: '/story/brand-new' }],
    );

    expect(chapters[0].path).toBe('/story/brand-new');
    expect(rebinds).toEqual([{ id: 3, path: '/story/brand-new' }]);
  });

  it('still inserts a genuinely new chapter', () => {
    const { chapters, rebinds } = stabilizeChapterPaths(
      [stored(1, '/novel/1', 'Chapter 1', 1)],
      [
        { name: 'Chapter 1', path: '/novel/1', chapterNumber: 1 },
        { name: 'Chapter 2', path: '/novel/2', chapterNumber: 2 },
      ],
    );

    expect(chapters.map(chapter => chapter.path)).toEqual([
      '/novel/1',
      '/novel/2',
    ]);
    expect(rebinds).toEqual([]);
  });

  it('rebinds stored rows when a multi-chapter novel only changes URLs', () => {
    const { rebinds } = stabilizeChapterPaths(
      [
        stored(1, '/old/1', 'Chapter 1', 1),
        stored(2, '/old/2', 'Chapter 2', 2),
      ],
      [
        { name: 'Chapter 1', path: '/new/1', chapterNumber: 1 },
        { name: 'Chapter 2', path: '/new/2', chapterNumber: 2 },
      ],
    );

    expect(rebinds).toEqual([
      { id: 1, path: '/new/1' },
      { id: 2, path: '/new/2' },
    ]);
  });
});
