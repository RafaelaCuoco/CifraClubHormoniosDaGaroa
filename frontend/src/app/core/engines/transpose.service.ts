import { Injectable } from '@angular/core';

export const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Módulo puro de transposição e cálculo de tom.
 * Não manipula o DOM.
 */
@Injectable({
  providedIn: 'root'
})
export class TransposeService {
  public readonly musicalKeys: readonly string[] = CHROMATIC_SCALE;

  public normalizeEnharmonic(chord: string): string {
    if (!chord) return chord;
    return chord
      .replace('Db', 'C#')
      .replace('Eb', 'D#')
      .replace('Gb', 'F#')
      .replace('Ab', 'G#')
      .replace('Bb', 'A#');
  }

  public transposeChord(chord: string, semitones: number): string {
    if (semitones === 0 || !chord) return chord;

    const normalized = this.normalizeEnharmonic(chord);
    const match = normalized.match(/^([A-G][#]?)(.*)/);
    if (!match) return chord;

    const root = match[1];
    const suffix = match[2];
    const rootIndex = CHROMATIC_SCALE.indexOf(root as (typeof CHROMATIC_SCALE)[number]);
    if (rootIndex === -1) return chord;

    const newIndex = (rootIndex + semitones + 120) % 12;
    return CHROMATIC_SCALE[newIndex] + suffix;
  }

  public transposeFret(baseFret: number, semitones: number): number {
    return Math.max(0, baseFret + (semitones || 0));
  }

  public stepUp(currentOffset: number): number {
    return (currentOffset + 1) % 12;
  }

  public stepDown(currentOffset: number): number {
    const next = (currentOffset - 1) % 12;
    return next < -11 ? 0 : next;
  }
}
