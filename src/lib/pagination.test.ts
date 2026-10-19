import { describe, expect, it } from 'vitest';
import { MAX_PAGE, pageCount, pageWindow, readPage } from './pagination';

describe('pageWindow', () => {
  it('показывает все страницы, если их не больше семи', () => {
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('оставляет первую, последнюю и соседей текущей', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 'gap', 20]);
    expect(pageWindow(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
    expect(pageWindow(20, 20)).toEqual([1, 'gap', 19, 20]);
  });
});

const read = (search: string) => readPage(new URLSearchParams(search));

describe('readPage', () => {
  it('берёт целый номер страницы', () => {
    expect(read('page=3')).toBe(3);
  });

  it('без параметра или с мусором — первая страница', () => {
    for (const search of ['', 'page=', 'page=0', 'page=-2', 'page=1.5', 'page=abc']) {
      expect(read(search)).toBe(1);
    }
  });

  it('не уводит глубже MAX_PAGE', () => {
    expect(read('page=100000')).toBe(MAX_PAGE);
  });
});

describe('pageCount', () => {
  it('всегда возвращает хотя бы одну страницу', () => {
    expect(pageCount(0, 12)).toBe(1);
    expect(pageCount(25, 12)).toBe(3);
  });

  it('не предлагает страниц глубже MAX_PAGE', () => {
    expect(pageCount(1_000_000, 12)).toBe(MAX_PAGE);
  });
});
