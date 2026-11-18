import { Injectable } from '@angular/core';
import {
  extractChordSequence,
  resolveBassRootNote,
  resolveCavaquinhoShape4,
  resolveChordShape6
} from '../helpers/chord-format.helper';
import { InstrumentConfig, getInstrumentConfig } from '../helpers/instrument-catalog';

export interface TabNote {
  stringIndex: number;
  fret: number;
  label?: string;
  technique?: 'h' | 'p' | '/' | '\\' | 'b' | '~' | null;
}

export interface TabColumn {
  index: number;
  measureIndex: number;
  beatInMeasure: number;
  chordLabel?: string;
  effectiveChord?: string;
  notes: TabNote[];
}

export interface TabMeasure {
  index: number;
  chordName: string;
  columns: TabColumn[];
}

export interface RenderedTabData {
  config: InstrumentConfig;
  measures: TabMeasure[];
  allColumns: TabColumn[];
  colsPerMeasure: number;
}

/**
 * Módulo puro de renderização lógica da tablatura e cálculo de posicionamento.
 * Não manipula o DOM.
 */
@Injectable({
  providedIn: 'root'
})
export class TabRenderer {
  public readonly columnWidthPx = 48;

  public buildTabData(content: string, instrumentId: string): RenderedTabData {
    const config = getInstrumentConfig(instrumentId);
    const chordSeq = extractChordSequence(content || '');

    if (config.category === 'percussao') {
      const cols = this.buildPercussionGroove(config.id, chordSeq);
      const measures = this.groupIntoMeasures(cols, 8, chordSeq);
      return { config, measures, allColumns: cols, colsPerMeasure: 8 };
    }

    const parsedCols = this.tryParseTabBlocks(content || '', config, chordSeq);
    if (parsedCols && parsedCols.length > 0) {
      // Se houver acordes após/além da tablatura escrita, anexa a base melódica em 8 colunas/compasso
      const hasExplicitChords = /\[([A-G][^\]]*)\]/.test(content || '');
      const baseMeasuresCount = Math.ceil(parsedCols.length / 8);
      if (hasExplicitChords && chordSeq.length > baseMeasuresCount) {
        const remainingChords = chordSeq.slice(baseMeasuresCount);
        const tailCols = this.generateMelodicColumns(config, remainingChords, 8, parsedCols.length);
        parsedCols.push(...tailCols);
      }
      const measures = this.groupIntoMeasures(parsedCols, 8, chordSeq);
      return { config, measures, allColumns: parsedCols, colsPerMeasure: 8 };
    }

    const generatedCols = this.generateMelodicColumns(config, chordSeq, 4, 0);
    const measures = this.groupIntoMeasures(generatedCols, 4, chordSeq);
    return { config, measures, allColumns: generatedCols, colsPerMeasure: 4 };
  }

  public computeChordConveyorOffsetPx(continuousColPos: number, colsPerMeasure: number): number {
    const cardWidth = 168;
    const continuousMeasure = continuousColPos / Math.max(1, colsPerMeasure);
    return Math.round(110 - continuousMeasure * cardWidth);
  }

  public computePlayheadOffsetPx(continuousColPos: number): number {
    return Math.round(continuousColPos * this.columnWidthPx + this.columnWidthPx / 2);
  }

  private tryParseTabBlocks(
    rawContent: string,
    config: InstrumentConfig,
    chordSeq: string[]
  ): TabColumn[] | null {
    if (config.category === 'percussao') return null;
    const lineCount = config.lineNames.length;
    if (lineCount !== 6 && lineCount !== 4) return null;

    const lines = rawContent.split(/\r?\n/);
    const tabBlocks: string[][] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const isTabRow = /^(?:[a-gA-G0-9][#b]?\s*)?\|/.test(trimmed) && trimmed.includes('-');
      if (isTabRow) {
        currentBlock.push(trimmed);
        if (currentBlock.length === lineCount) {
          tabBlocks.push(currentBlock);
          currentBlock = [];
        }
      } else if (currentBlock.length > 0 && trimmed.length > 0) {
        currentBlock = [];
      }
    }

    if (tabBlocks.length === 0) return null;

    const extractedCols: TabColumn[] = [];
    const techniques = new Set(['h', 'p', '/', '\\', 'b', '~']);

    for (const block of tabBlocks) {
      const sliceLines = block.map(l => {
        const pipeIdx = l.indexOf('|');
        return pipeIdx >= 0 ? l.substring(pipeIdx + 1) : l;
      });
      const maxLen = Math.max(...sliceLines.map(s => s.length));
      const consumedDigits = new Set<string>();

      for (let i = 0; i < maxLen; i++) {
        const notesInCol: TabNote[] = [];
        for (let s = 0; s < lineCount; s++) {
          if (consumedDigits.has(`${s}:${i}`)) continue;
          const row = sliceLines[s] || '';
          const ch = row[i] || '';
          if (ch >= '0' && ch <= '9') {
            let fretNum = parseInt(ch, 10);
            let afterIdx = i + 1;
            const nextCh = afterIdx < row.length ? row[afterIdx] : '';
            if (nextCh >= '0' && nextCh <= '9') {
              fretNum = fretNum * 10 + parseInt(nextCh, 10);
              consumedDigits.add(`${s}:${afterIdx}`);
              afterIdx++;
            }
            const techCh = afterIdx < row.length ? row[afterIdx] : '';
            const technique = techniques.has(techCh)
              ? (techCh as TabNote['technique'])
              : undefined;
            notesInCol.push({ stringIndex: s, fret: fretNum, technique });
          }
        }

        if (notesInCol.length > 0) {
          const mIdx = Math.floor(extractedCols.length / 8);
          const chordForM = chordSeq[mIdx % Math.max(1, chordSeq.length)] || 'C';
          extractedCols.push({
            index: extractedCols.length,
            measureIndex: mIdx,
            beatInMeasure: Math.floor((extractedCols.length % 8) / 2) + 1,
            chordLabel: extractedCols.length % 8 === 0 ? chordForM : undefined,
            effectiveChord: chordForM,
            notes: notesInCol
          });
        }
      }
    }

    return extractedCols.length > 0 ? extractedCols : null;
  }

  private generateMelodicColumns(
    config: InstrumentConfig,
    chordSeq: string[],
    colsPerMeasure: 4 | 8 = 4,
    startIndex = 0
  ): TabColumn[] {
    const generatedCols: TabColumn[] = [];

    chordSeq.forEach((chordName, localMeasureIdx) => {
      const mIdx = Math.floor((startIndex + generatedCols.length) / colsPerMeasure);

      if (config.id === 'Cavaquinho') {
        const cavShape = resolveCavaquinhoShape4(chordName);
        const all4: TabNote[] = cavShape.map((fret, idx) => ({ stringIndex: idx, fret }));
        const basePattern = [all4, all4.slice(0, 2), all4.slice(2, 4), all4];
        const pattern =
          colsPerMeasure === 8
            ? basePattern.flatMap(g => [g, all4.slice(0, 2)])
            : basePattern;
        pattern.forEach((notes, stepIdx) => {
          generatedCols.push({
            index: startIndex + generatedCols.length,
            measureIndex: mIdx,
            beatInMeasure:
              colsPerMeasure === 8 ? Math.floor(stepIdx / 2) + 1 : stepIdx + 1,
            chordLabel: stepIdx === 0 ? chordName : undefined,
            effectiveChord: chordName,
            notes
          });
        });
        return;
      }

      if (config.id === 'Baixo') {
        const bassRoot = resolveBassRootNote(chordName);
        const rootNote: TabNote = { stringIndex: bassRoot.stringIndex, fret: bassRoot.fret };
        const fifthStringIdx = Math.max(0, bassRoot.stringIndex - 1);
        const fifthNote: TabNote = { stringIndex: fifthStringIdx, fret: bassRoot.fret + 2 };
        const octaveNote: TabNote = {
          stringIndex: Math.max(0, bassRoot.stringIndex - 2),
          fret: bassRoot.fret + 2
        };
        const basePattern: TabNote[][] = [
          [rootNote],
          [fifthNote],
          [rootNote],
          [octaveNote]
        ];
        const pattern =
          colsPerMeasure === 8
            ? basePattern.flatMap(g => [g, [rootNote]])
            : basePattern;
        pattern.forEach((notes, stepIdx) => {
          generatedCols.push({
            index: startIndex + generatedCols.length,
            measureIndex: mIdx,
            beatInMeasure:
              colsPerMeasure === 8 ? Math.floor(stepIdx / 2) + 1 : stepIdx + 1,
            chordLabel: stepIdx === 0 ? chordName : undefined,
            effectiveChord: chordName,
            notes
          });
        });
        return;
      }

      const shape = resolveChordShape6(chordName);
      const fullChordNotes: TabNote[] = [];
      shape.forEach((fret, sIdx) => {
        if (fret !== null) {
          fullChordNotes.push({ stringIndex: sIdx, fret });
        }
      });

      const bassNote = fullChordNotes[fullChordNotes.length - 1] || fullChordNotes[0];
      const highNotes = fullChordNotes.slice(0, 3);
      const midNote = fullChordNotes[Math.min(2, fullChordNotes.length - 1)] || fullChordNotes[0];

      const basePattern: TabNote[][] = [
        fullChordNotes,
        bassNote ? [bassNote] : fullChordNotes,
        highNotes.length > 0 ? highNotes : fullChordNotes,
        midNote ? [midNote] : fullChordNotes
      ];
      const pattern =
        colsPerMeasure === 8
          ? basePattern.flatMap(g => [g, midNote ? [midNote] : fullChordNotes])
          : basePattern;

      pattern.forEach((notesGroup, stepIdx) => {
        generatedCols.push({
          index: startIndex + generatedCols.length,
          measureIndex: mIdx,
          beatInMeasure:
            colsPerMeasure === 8 ? Math.floor(stepIdx / 2) + 1 : stepIdx + 1,
          chordLabel: stepIdx === 0 ? chordName : undefined,
          effectiveChord: chordName,
          notes: notesGroup
        });
      });

      void localMeasureIdx;
    });

    return generatedCols;
  }

  private buildPercussionGroove(instId: string, chordSeq: string[]): TabColumn[] {
    const cols: TabColumn[] = [];
    const totalMeasures = Math.max(2, chordSeq.length);
    const totalSteps = totalMeasures * 8;
    const beatLabels: Record<number, string> = { 0: '1', 2: '2', 4: '3', 6: '4' };

    for (let step = 0; step < totalSteps; step++) {
      const sMod = step % 16;
      const mIdx = Math.floor(step / 8);
      const chordForMeasure = chordSeq[mIdx % chordSeq.length] || 'C';
      const notes = this.buildPercussionStepNotes(instId, sMod);

      cols.push({
        index: step,
        measureIndex: mIdx,
        beatInMeasure: Math.floor((step % 8) / 2) + 1,
        chordLabel: beatLabels[step % 8],
        effectiveChord: chordForMeasure,
        notes
      });
    }

    return cols;
  }

  private buildPercussionStepNotes(instId: string, sMod: number): TabNote[] {
    const notes: TabNote[] = [];

    if (instId === 'Caixa') {
      const accents = [0, 3, 6, 8, 11, 14];
      if (accents.includes(sMod)) {
        notes.push({ stringIndex: 0, fret: 0, label: 'R' });
        notes.push({ stringIndex: 1, fret: 0, label: '>' });
      } else if (sMod % 2 === 1) {
        notes.push({ stringIndex: 3, fret: 0, label: 'r' });
      } else {
        notes.push({ stringIndex: 4, fret: 0, label: '·' });
      }
      return notes;
    }

    const simpleMaps: Record<string, Record<number, { idx: number; lbl: string }>> = {
      Tamborim: {
        0: { idx: 0, lbl: 'X' }, 2: { idx: 1, lbl: 'X' }, 3: { idx: 2, lbl: 'X' },
        4: { idx: 0, lbl: 'X' }, 6: { idx: 1, lbl: 'X' }, 7: { idx: 0, lbl: 'X' },
        8: { idx: 3, lbl: 'X' }, 9: { idx: 4, lbl: 'X' }, 10: { idx: 2, lbl: 'X' },
        11: { idx: 1, lbl: 'X' }, 12: { idx: 0, lbl: 'X' }, 14: { idx: 1, lbl: 'X' }, 15: { idx: 2, lbl: 'X' }
      },
      Repinique: {
        0: { idx: 1, lbl: 'X' }, 1: { idx: 2, lbl: 'X' }, 2: { idx: 3, lbl: 'X' },
        3: { idx: 0, lbl: 'X' }, 4: { idx: 1, lbl: 'X' }, 5: { idx: 2, lbl: 'X' },
        6: { idx: 0, lbl: 'X' }, 7: { idx: 3, lbl: 'X' }, 8: { idx: 1, lbl: 'X' },
        9: { idx: 2, lbl: 'X' }, 10: { idx: 3, lbl: 'X' }, 11: { idx: 0, lbl: 'X' },
        12: { idx: 4, lbl: 'X' }, 13: { idx: 4, lbl: 'X' }, 14: { idx: 0, lbl: 'X' }, 15: { idx: 5, lbl: 'X' }
      },
      Agogô: {
        0: { idx: 3, lbl: '4' }, 2: { idx: 3, lbl: '4' }, 3: { idx: 2, lbl: '3' },
        5: { idx: 1, lbl: '2' }, 6: { idx: 0, lbl: '1' }, 7: { idx: 1, lbl: '2' },
        8: { idx: 3, lbl: '4' }, 10: { idx: 2, lbl: '3' }, 11: { idx: 1, lbl: '2' },
        12: { idx: 0, lbl: '1' }, 14: { idx: 1, lbl: '2' }, 15: { idx: 2, lbl: '3' }
      },
      Timbal: {
        0: { idx: 3, lbl: 'B' }, 2: { idx: 2, lbl: 'B' }, 3: { idx: 0, lbl: 'S' },
        4: { idx: 1, lbl: 'O' }, 6: { idx: 0, lbl: 'S' }, 7: { idx: 2, lbl: 'B' },
        8: { idx: 3, lbl: 'B' }, 10: { idx: 1, lbl: 'O' }, 11: { idx: 0, lbl: 'S' },
        12: { idx: 3, lbl: 'B' }, 14: { idx: 0, lbl: 'S' }, 15: { idx: 1, lbl: 'O' }
      },
      'Surdo de Primeira': {
        0: { idx: 0, lbl: 'm' }, 4: { idx: 1, lbl: 'O' }, 8: { idx: 0, lbl: 'm' },
        12: { idx: 1, lbl: 'O' }, 15: { idx: 4, lbl: 'p' }
      },
      'Surdo de Segunda': {
        0: { idx: 1, lbl: 'O' }, 4: { idx: 0, lbl: 'm' }, 7: { idx: 4, lbl: 'v' },
        8: { idx: 1, lbl: 'O' }, 12: { idx: 0, lbl: 'm' }
      },
      'Surdo de Terceira': {
        0: { idx: 0, lbl: 'm' }, 2: { idx: 1, lbl: 'C' }, 3: { idx: 2, lbl: 'B' },
        6: { idx: 1, lbl: 'C' }, 8: { idx: 0, lbl: 'm' }, 10: { idx: 1, lbl: 'C' },
        11: { idx: 2, lbl: 'B' }, 13: { idx: 3, lbl: 'r' }, 14: { idx: 1, lbl: 'C' }
      }
    };

    const mapped = simpleMaps[instId];
    if (mapped) {
      if (mapped[sMod]) {
        notes.push({ stringIndex: mapped[sMod].idx, fret: 0, label: mapped[sMod].lbl });
      }
      return notes;
    }

    if (instId === 'Alfaia') {
      const alfaiaBaque = [0, 3, 6, 8, 10, 11, 14];
      const alfaiaTaque = [2, 4, 5, 7, 12, 15];
      if (alfaiaBaque.includes(sMod)) {
        notes.push({ stringIndex: sMod % 8 === 0 ? 5 : 2, fret: 0, label: 'O' });
      }
      if (alfaiaTaque.includes(sMod)) {
        notes.push({ stringIndex: 0, fret: 0, label: 'T' });
      }
      return notes;
    }

    if (sMod % 2 === 0) notes.push({ stringIndex: 0, fret: 0, label: 'x' });
    if (sMod === 0) notes.push({ stringIndex: 1, fret: 0, label: '*' });
    if (sMod === 4 || sMod === 12) notes.push({ stringIndex: 2, fret: 0, label: 'O' });
    if (sMod === 0 || sMod === 3 || sMod === 8 || sMod === 11) notes.push({ stringIndex: 5, fret: 0, label: '●' });
    if (sMod === 6 || sMod === 14) notes.push({ stringIndex: 4, fret: 0, label: 'o' });
    return notes;
  }

  private groupIntoMeasures(
    cols: TabColumn[],
    colsPerMeasure: number,
    chordSeq: string[]
  ): TabMeasure[] {
    const map = new Map<number, TabMeasure>();
    cols.forEach((c, idx) => {
      const mIdx = Math.floor(idx / colsPerMeasure);
      c.measureIndex = mIdx;
      c.index = idx;
      if (!map.has(mIdx)) {
        const chordName = c.effectiveChord || chordSeq[mIdx % Math.max(1, chordSeq.length)] || 'C';
        map.set(mIdx, { index: mIdx, chordName, columns: [] });
      }
      map.get(mIdx)!.columns.push(c);
    });
    return Array.from(map.values());
  }
}
