import { TransposeService } from '../engines/transpose.service';

export interface LyricSegment {
  chord?: string;
  transposedChord?: string;
  text: string;
}

export interface ParsedLine {
  type: 'section' | 'tab' | 'chords-and-lyrics' | 'empty';
  raw: string;
  segments?: LyricSegment[];
}

export interface DisplayChord {
  originalName: string;
  transposedName: string;
  diagram: string;
  baseFret: number;
}

export const COMMON_CHORDS: readonly string[] = [
  'C', 'D', 'E', 'F', 'G', 'A', 'B',
  'Am', 'Dm', 'Em', 'F#m', 'Bm',
  'C7', 'G7', 'A7'
];

export const STANDARD_CHORD_DIAGRAMS: Record<string, string> = {
  'C': 'x,3,2,0,1,0',
  'C#': 'x,4,6,6,6,4',
  'Db': 'x,4,6,6,6,4',
  'D': 'x,x,0,2,3,2',
  'D#': 'x,6,8,8,8,6',
  'Eb': 'x,6,8,8,8,6',
  'E': '0,2,2,1,0,0',
  'F': '1,3,3,2,1,1',
  'F#': '2,4,4,3,2,2',
  'Gb': '2,4,4,3,2,2',
  'G': '3,2,0,0,0,3',
  'G#': '4,6,6,5,4,4',
  'Ab': '4,6,6,5,4,4',
  'A': 'x,0,2,2,2,0',
  'A#': 'x,1,3,3,3,1',
  'Bb': 'x,1,3,3,3,1',
  'B': 'x,2,4,4,4,2',
  'Cm': 'x,3,5,5,4,3',
  'C#m': 'x,4,6,6,5,4',
  'Dbm': 'x,4,6,6,5,4',
  'Dm': 'x,x,0,2,3,1',
  'D#m': 'x,6,8,8,7,6',
  'Ebm': 'x,6,8,8,7,6',
  'Em': '0,2,2,0,0,0',
  'Fm': '1,3,3,1,1,1',
  'F#m': '2,4,4,2,2,2',
  'Gbm': '2,4,4,2,2,2',
  'Gm': '3,5,5,3,3,3',
  'G#m': '4,6,6,4,4,4',
  'Abm': '4,6,6,4,4,4',
  'Am': 'x,0,2,2,1,0',
  'A#m': 'x,1,3,3,2,1',
  'Bbm': 'x,1,3,3,2,1',
  'Bm': 'x,2,4,4,3,2',
  'C7': 'x,3,2,3,1,0',
  'D7': 'x,x,0,2,1,2',
  'E7': '0,2,0,1,0,0',
  'F7': '1,3,1,2,1,1',
  'G7': '3,2,0,0,0,1',
  'A7': 'x,0,2,0,2,0',
  'B7': 'x,2,1,2,0,2'
};

export const CHORD_FRET_SHAPES_6: Record<string, (number | null)[]> = {
  'C': [0, 1, 0, 2, 3, null],
  'C#': [4, 6, 6, 6, 4, null],
  'D': [2, 3, 2, 0, null, null],
  'D#': [6, 8, 8, 8, 6, null],
  'E': [0, 0, 1, 2, 2, 0],
  'F': [1, 1, 2, 3, 3, 1],
  'F#': [2, 2, 3, 4, 4, 2],
  'G': [3, 0, 0, 0, 2, 3],
  'G#': [4, 4, 5, 6, 6, 4],
  'A': [0, 2, 2, 2, 0, null],
  'A#': [1, 3, 3, 3, 1, null],
  'B': [2, 4, 4, 4, 2, null],
  'Cm': [3, 4, 5, 5, 3, null],
  'C#m': [4, 5, 6, 6, 4, null],
  'Dm': [1, 3, 2, 0, null, null],
  'D#m': [6, 7, 8, 8, 6, null],
  'Em': [0, 0, 0, 2, 2, 0],
  'Fm': [1, 1, 1, 3, 3, 1],
  'F#m': [2, 2, 2, 4, 4, 2],
  'Gm': [3, 3, 3, 5, 5, 3],
  'G#m': [4, 4, 4, 6, 6, 4],
  'Am': [0, 1, 2, 2, 0, null],
  'A#m': [1, 2, 3, 3, 1, null],
  'Bm': [2, 3, 4, 4, 2, null],
  'C7': [0, 1, 3, 2, 3, null],
  'D7': [2, 1, 2, 0, null, null],
  'E7': [0, 0, 1, 0, 2, 0],
  'F7': [1, 1, 2, 1, 3, 1],
  'G7': [1, 0, 0, 0, 2, 3],
  'A7': [0, 2, 0, 2, 0, null],
  'B7': [2, 0, 2, 1, 2, null]
};

export const CAVAQUINHO_SHAPES_4: Record<string, number[]> = {
  'C': [2, 1, 0, 2],
  'D': [0, 3, 2, 0],
  'E': [2, 0, 1, 2],
  'F': [3, 1, 2, 3],
  'G': [0, 0, 0, 0],
  'A': [2, 2, 2, 2],
  'B': [4, 4, 4, 4],
  'Am': [2, 1, 2, 2],
  'Dm': [0, 3, 2, 3],
  'Em': [2, 0, 0, 2],
  'C7': [2, 1, 3, 2],
  'G7': [3, 0, 0, 0],
  'A7': [2, 2, 0, 2]
};

const CHORD_NAME_PATTERN = /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M|[0-9]|[()+°º]|\/[A-G][#b]?)*$/;
const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1,
  D: 2, 'D#': 3, Eb: 3,
  E: 4, Fb: 4, 'E#': 5,
  F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10,
  B: 11, Cb: 11, 'B#': 0
};
const SEMITONE_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function isChordName(str: string): boolean {
  return CHORD_NAME_PATTERN.test((str || '').trim());
}

/**
 * Extrai nota raiz, sufixo de qualidade e baixo opcional de um acorde (ex: "F#m7/C#").
 */
export function parseChordParts(chordName: string): {
  root: string;
  normalizedRoot: string;
  suffix: string;
  bassRoot: string | null;
} | null {
  const clean = (chordName || '').trim();
  const match = clean.match(/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/);
  if (!match) return null;
  const semitone = NOTE_TO_SEMITONE[match[1]];
  if (semitone === undefined) return null;
  const normalizedRoot = SEMITONE_TO_SHARP[semitone];
  const bassSemitone = match[3] ? NOTE_TO_SEMITONE[match[3]] : undefined;
  return {
    root: match[1],
    normalizedRoot,
    suffix: (match[2] || '').trim(),
    bassRoot: bassSemitone !== undefined ? SEMITONE_TO_SHARP[bassSemitone] : null
  };
}

function normalizeChordQualityForLookup(chordName: string): string {
  const parts = parseChordParts(chordName);
  if (!parts) return chordName;
  const s = parts.suffix;
  if (!s) return parts.normalizedRoot;
  if (/^m(?:7|9|11|13|\(9\))?$/.test(s) && s !== 'maj7' && !s.startsWith('maj')) {
    return `${parts.normalizedRoot}m`;
  }
  if (/^7/.test(s) && !/^7[M+]/.test(s)) {
    return `${parts.normalizedRoot}7`;
  }
  if (s.startsWith('m')) {
    return `${parts.normalizedRoot}m`;
  }
  return parts.normalizedRoot;
}

/**
 * Resolve o shape de 6 cordas (e-B-G-D-A-E) para qualquer acorde válido,
 * usando mapa direto ou transposição cromática de forma aberta/pestana.
 */
export function resolveChordShape6(chordName: string): (number | null)[] {
  const clean = (chordName || '').trim();
  if (CHORD_FRET_SHAPES_6[clean]) return CHORD_FRET_SHAPES_6[clean];

  const parts = parseChordParts(clean);
  if (!parts) return CHORD_FRET_SHAPES_6['C'];

  const exactNorm = `${parts.normalizedRoot}${parts.suffix}`;
  if (CHORD_FRET_SHAPES_6[exactNorm]) return CHORD_FRET_SHAPES_6[exactNorm];

  const baseKey = normalizeChordQualityForLookup(clean);
  if (CHORD_FRET_SHAPES_6[baseKey]) return CHORD_FRET_SHAPES_6[baseKey];

  const rootSemi = NOTE_TO_SEMITONE[parts.normalizedRoot] ?? 0;
  const isMinor = /^m(?!aj)/i.test(parts.suffix);
  const isDom7 = /^7(?![M+])/i.test(parts.suffix);
  // Transpõe a partir da forma em E (0) ou A (9) para manter digitação natural no braço
  const baseRoot = isMinor ? 'Em' : isDom7 ? 'E7' : 'E';
  const baseSemi = 4; // E
  const shift = (rootSemi - baseSemi + 12) % 12;
  const template = CHORD_FRET_SHAPES_6[baseRoot];
  return template.map(f => (f === null ? null : f + shift));
}

/**
 * Resolve o shape de 4 cordas (d-B-G-D) de Cavaquinho para qualquer acorde válido.
 */
export function resolveCavaquinhoShape4(chordName: string): number[] {
  const clean = (chordName || '').trim();
  if (CAVAQUINHO_SHAPES_4[clean]) return CAVAQUINHO_SHAPES_4[clean];

  const parts = parseChordParts(clean);
  if (!parts) return CAVAQUINHO_SHAPES_4['C'];

  const exactNorm = `${parts.normalizedRoot}${parts.suffix}`;
  if (CAVAQUINHO_SHAPES_4[exactNorm]) return CAVAQUINHO_SHAPES_4[exactNorm];

  const baseKey = normalizeChordQualityForLookup(clean);
  if (CAVAQUINHO_SHAPES_4[baseKey]) return CAVAQUINHO_SHAPES_4[baseKey];

  const rootSemi = NOTE_TO_SEMITONE[parts.normalizedRoot] ?? 0;
  const isMinor = /^m(?!aj)/i.test(parts.suffix);
  const isDom7 = /^7(?![M+])/i.test(parts.suffix);
  const baseShape = isMinor
    ? CAVAQUINHO_SHAPES_4['Am']
    : isDom7
      ? CAVAQUINHO_SHAPES_4['A7']
      : CAVAQUINHO_SHAPES_4['G'];
  const baseSemi = isMinor || isDom7 ? 9 : 7;
  const shift = (rootSemi - baseSemi + 12) % 12;
  return baseShape.map(f => f + shift);
}

/**
 * Calcula a casa e corda da tônica (ou baixo invertido) no Baixo 4 cordas (G-D-A-E -> idx 0..3).
 */
export function resolveBassRootNote(chordName: string): { stringIndex: number; fret: number } {
  const parts = parseChordParts(chordName);
  const noteName = parts?.bassRoot || parts?.normalizedRoot || 'C';
  const targetSemi = NOTE_TO_SEMITONE[noteName] ?? 0;
  // Corda E (index 3, E1 -> semi 4) vs Corda A (index 2, A1 -> semi 9)
  const fretOnE = (targetSemi - 4 + 12) % 12;
  const fretOnA = (targetSemi - 9 + 12) % 12;
  if (fretOnE <= 5) {
    return { stringIndex: 3, fret: fretOnE };
  }
  return { stringIndex: 2, fret: fretOnA };
}

export function isTabLine(trimmedLine: string): boolean {
  return /^[eBGDAEd]\|/i.test(trimmedLine) || (trimmedLine.includes('|') && trimmedLine.includes('-'));
}

export function parseChordSheet(
  rawContent: string,
  semitoneOffset: number,
  transpose: TransposeService
): ParsedLine[] {
  if (!rawContent) return [];
  const lines = rawContent.split(/\r?\n/);

  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      return { type: 'empty', raw: line };
    }

    const sectionMatch = trimmed.match(/^\[([a-zA-ZÀ-ÿ\s0-9\-_:.]+)\]$/);
    if (sectionMatch && sectionMatch[1].length > 4 && !isChordName(sectionMatch[1])) {
      return { type: 'section', raw: sectionMatch[1] };
    }

    if (isTabLine(trimmed)) {
      return { type: 'tab', raw: line };
    }

    if (/\[[A-G][^\]]*\]/.test(line)) {
      const segments: LyricSegment[] = [];
      const regex = /\[([A-G][^\]]*)\]([^\[]*)/g;

      const firstBracket = line.indexOf('[');
      if (firstBracket > 0) {
        segments.push({ text: line.substring(0, firstBracket) });
      }

      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        const chordName = match[1];
        const text = match[2];
        segments.push({
          chord: chordName,
          transposedChord: transpose.transposeChord(chordName, semitoneOffset),
          text
        });
      }

      return {
        type: 'chords-and-lyrics',
        raw: line,
        segments: segments.length > 0 ? segments : [{ text: line }]
      };
    }

    return {
      type: 'chords-and-lyrics',
      raw: line,
      segments: [{ text: line }]
    };
  });
}

export function buildDisplayChords(
  songChords: { name: string }[] | undefined,
  content: string | undefined,
  semitoneOffset: number,
  transpose: TransposeService
): DisplayChord[] {
  const chordNames = new Set<string>();

  if (songChords && songChords.length > 0) {
    songChords.forEach(c => chordNames.add(c.name));
  }

  if (content) {
    const matches = content.match(/\[([A-G][^\]]*)\]/g);
    if (matches) {
      matches.forEach(m => {
        const raw = m.substring(1, m.length - 1).trim();
        if (isChordName(raw)) {
          chordNames.add(raw);
        }
      });
    }
  }

  const list: DisplayChord[] = [];
  chordNames.forEach(name => {
    const transposed = transpose.transposeChord(name, semitoneOffset);
    const diagram =
      STANDARD_CHORD_DIAGRAMS[transposed] ||
      STANDARD_CHORD_DIAGRAMS[name] ||
      'x,0,2,2,1,0';

    list.push({
      originalName: name,
      transposedName: transposed,
      diagram,
      baseFret: 1
    });
  });

  return list;
}

export function parseChordDiagram(diagramStr: string): { stringIdx: number; fret: number | 'x' }[] {
  if (!diagramStr) return [];
  return diagramStr.split(',').map((part, index) => {
    const trimmed = part.trim().toLowerCase();
    if (trimmed === 'x') {
      return { stringIdx: index, fret: 'x' };
    }
    const num = parseInt(trimmed, 10);
    return { stringIdx: index, fret: Number.isNaN(num) ? 0 : num };
  });
}

export function extractChordSequence(rawContent: string, maxChords = 128): string[] {
  const chordMatches = (rawContent || '').match(/\[([A-G][^\]]*)\]/g) || [];
  const seq: string[] = [];
  for (const m of chordMatches) {
    const clean = m.slice(1, -1).trim();
    if (clean && isChordName(clean) && seq.length < maxChords) {
      seq.push(clean);
    }
  }
  if (seq.length === 0) {
    seq.push('C', 'Am', 'Em', 'G');
  }
  return seq;
}
