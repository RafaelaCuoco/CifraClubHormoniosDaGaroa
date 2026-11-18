import { TabRenderer } from './tab-renderer.service';

describe('TabRenderer', () => {
  let renderer: TabRenderer;

  beforeEach(() => {
    renderer = new TabRenderer();
  });

  it('deve ler todas as notas da tablatura sem pular colunas adjacentes nem trastes de 2 dígitos', () => {
    const tabContent = [
      'e|--0--12-14---------|',
      'B|-1----0---13-------|',
      'G|-------------------|',
      'D|-------------------|',
      'A|3------------------|',
      'E|-------------------|'
    ].join('\n');

    const result = renderer.buildTabData(tabContent, 'Guitarra');
    const allFrets = result.allColumns.flatMap(c => c.notes.map(n => `${n.stringIndex}:${n.fret}`));

    expect(allFrets).toEqual(['4:3', '1:1', '0:0', '0:12', '1:0', '0:14', '1:13']);
  });

  it('deve ler múltiplos blocos de tablatura e acordes seguintes sem descartar notas', () => {
    const content = [
      '[Intro]',
      'e|-0---3---|',
      'B|---1-----|',
      'G|---------|',
      'D|---------|',
      'A|---------|',
      'E|---------|',
      '',
      '[Solo]',
      'e|-5-7-----|',
      'B|---------|',
      'G|---------|',
      'D|---------|',
      'A|---------|',
      'E|---------|',
      '',
      '[C] Linha [Dm7] dois [G/B] tres [Cmaj7] quatro'
    ].join('\n');

    const result = renderer.buildTabData(content, 'Violão');
    const tabNotesOnly = result.allColumns.slice(0, 5).flatMap(c => c.notes.map(n => n.fret));
    expect(tabNotesOnly).toEqual([0, 1, 3, 5, 7]);
    expect(result.measures.length).toBeGreaterThanOrEqual(4);
  });

  it('deve ler mais de 16 acordes e acordes com extensões, sustenidos, bemóis e baixos invertidos', () => {
    const chords = [
      '[C]', '[Cmaj7]', '[Dm7]', '[G7]', '[Em7]', '[Am7]', '[D/F#]', '[G/B]',
      '[Bb]', '[Eb]', '[F#m7]', '[Bm7]', '[C#7]', '[Asus4]', '[C]', '[C]', '[F]', '[G]'
    ].join(' texto ');

    const violao = renderer.buildTabData(chords, 'Violão');
    expect(violao.measures.length).toBe(18);
    expect(violao.allColumns.every(c => c.notes.length > 0)).toBe(true);

    const cavaco = renderer.buildTabData(chords, 'Cavaquinho');
    expect(cavaco.measures.length).toBe(18);
    expect(cavaco.allColumns.every(c => c.notes.length > 0)).toBe(true);

    const baixo = renderer.buildTabData(chords, 'Baixo');
    expect(baixo.measures.length).toBe(18);
    expect(baixo.allColumns.every(c => c.notes.length > 0)).toBe(true);
  });
});
