import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map } from 'rxjs';
import { TransposeService } from '../engines/transpose.service';
import { Song } from '../models/song.model';

export const STUDY_SPEED_OPTIONS = [
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1, label: '100%' },
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' }
] as const;

export interface PlayerState {
  instrument: string;
  originalKey: string;
  semitoneOffset: number;
  bpm: number;
  studySpeed: number;
  loopEnabled: boolean;
  metronomeEnabled: boolean;
  isPlaying: boolean;
  currentMeasure: number;
  totalMeasures: number;
  currentBeat: number;
  activePlayingChord: string | null;
  isAutoScrolling: boolean;
  autoScrollSpeedPxPerSec: number;
  pendingPlayOnLoad: boolean;
}

const INITIAL_PLAYER_STATE: PlayerState = {
  instrument: 'Violão',
  originalKey: 'C',
  semitoneOffset: 0,
  bpm: 120,
  studySpeed: 1,
  loopEnabled: true,
  metronomeEnabled: false,
  isPlaying: false,
  currentMeasure: 1,
  totalMeasures: 1,
  currentBeat: 1,
  activePlayingChord: null,
  isAutoScrolling: false,
  autoScrollSpeedPxPerSec: 40,
  pendingPlayOnLoad: false
};

@Injectable({
  providedIn: 'root'
})
export class PlayerStore {
  private readonly transposeService = inject(TransposeService);
  private readonly stateSubject = new BehaviorSubject<PlayerState>(INITIAL_PLAYER_STATE);
  public readonly state$ = this.stateSubject.asObservable();

  private readonly stopNonceSubject = new BehaviorSubject<number>(0);
  public readonly stopSignal$ = this.stopNonceSubject.asObservable();

  public readonly instrument$ = this.state$.pipe(map(s => s.instrument), distinctUntilChanged());
  public readonly originalKey$ = this.state$.pipe(map(s => s.originalKey), distinctUntilChanged());
  public readonly semitoneOffset$ = this.state$.pipe(map(s => s.semitoneOffset), distinctUntilChanged());
  public readonly bpm$ = this.state$.pipe(map(s => s.bpm), distinctUntilChanged());
  public readonly studySpeed$ = this.state$.pipe(map(s => s.studySpeed), distinctUntilChanged());
  public readonly loopEnabled$ = this.state$.pipe(map(s => s.loopEnabled), distinctUntilChanged());
  public readonly metronomeEnabled$ = this.state$.pipe(map(s => s.metronomeEnabled), distinctUntilChanged());
  public readonly isPlaying$ = this.state$.pipe(map(s => s.isPlaying), distinctUntilChanged());
  public readonly currentMeasure$ = this.state$.pipe(map(s => s.currentMeasure), distinctUntilChanged());
  public readonly totalMeasures$ = this.state$.pipe(map(s => s.totalMeasures), distinctUntilChanged());
  public readonly currentBeat$ = this.state$.pipe(map(s => s.currentBeat), distinctUntilChanged());
  public readonly activePlayingChord$ = this.state$.pipe(map(s => s.activePlayingChord), distinctUntilChanged());
  public readonly isAutoScrolling$ = this.state$.pipe(map(s => s.isAutoScrolling), distinctUntilChanged());
  public readonly autoScrollSpeedPxPerSec$ = this.state$.pipe(
    map(s => s.autoScrollSpeedPxPerSec),
    distinctUntilChanged()
  );

  public readonly currentKey$ = combineLatest([this.originalKey$, this.semitoneOffset$]).pipe(
    map(([originalKey, offset]) => this.transposeChordName(originalKey || 'C', offset)),
    distinctUntilChanged()
  );

  public get snapshot(): PlayerState {
    return this.stateSubject.getValue();
  }

  public syncFromSong(song: Song | null): void {
    if (!song) return;
    const defaultInstrument =
      song.tracks && song.tracks.length > 0 ? song.tracks[0].instrument : 'Violão';

    this.patch({
      originalKey: song.originalKey || 'C',
      semitoneOffset: 0,
      bpm: song.bpm && song.bpm > 0 ? song.bpm : 120,
      instrument: defaultInstrument,
      isPlaying: false,
      currentMeasure: 1,
      currentBeat: 1,
      activePlayingChord: null,
      isAutoScrolling: false
    });
  }

  public setInstrument(instrument: string): void {
    if (!instrument) return;
    this.patch({ instrument });
  }

  public transposeUp(): void {
    this.patch({ semitoneOffset: this.transposeService.stepUp(this.snapshot.semitoneOffset) });
  }

  public transposeDown(): void {
    this.patch({ semitoneOffset: this.transposeService.stepDown(this.snapshot.semitoneOffset) });
  }

  public resetTranspose(): void {
    this.patch({ semitoneOffset: 0 });
  }

  public setBpm(bpm: number): void {
    const safeBpm = Math.max(40, Math.min(240, Math.round(Number(bpm) || 120)));
    this.patch({ bpm: safeBpm });
  }

  public setStudySpeed(multiplier: number): void {
    const safe = Math.max(0.5, Math.min(1.5, Number(multiplier) || 1));
    this.patch({ studySpeed: safe });
  }

  public toggleLoop(): void {
    this.patch({ loopEnabled: !this.snapshot.loopEnabled });
  }

  public toggleMetronome(): void {
    this.patch({ metronomeEnabled: !this.snapshot.metronomeEnabled });
  }

  public play(): void {
    this.patch({ isPlaying: true, pendingPlayOnLoad: false });
  }

  public pause(): void {
    this.patch({ isPlaying: false, pendingPlayOnLoad: false });
  }

  public togglePlay(): void {
    this.patch({ isPlaying: !this.snapshot.isPlaying, pendingPlayOnLoad: false });
  }

  public stop(): void {
    this.patch({
      isPlaying: false,
      pendingPlayOnLoad: false,
      currentMeasure: 1,
      currentBeat: 1,
      activePlayingChord: null
    });
    this.stopNonceSubject.next(this.stopNonceSubject.getValue() + 1);
  }

  public requestPlayOnLoad(): void {
    this.patch({ pendingPlayOnLoad: true });
  }

  public consumePendingPlay(): boolean {
    if (!this.snapshot.pendingPlayOnLoad) return false;
    this.patch({ pendingPlayOnLoad: false, isPlaying: true });
    return true;
  }

  public setPlaybackProgress(
    currentMeasure: number,
    totalMeasures: number,
    currentBeat: number,
    activePlayingChord: string | null
  ): void {
    const s = this.snapshot;
    if (
      s.currentMeasure === currentMeasure &&
      s.totalMeasures === totalMeasures &&
      s.currentBeat === currentBeat &&
      s.activePlayingChord === activePlayingChord
    ) {
      return;
    }
    this.patch({ currentMeasure, totalMeasures, currentBeat, activePlayingChord });
  }

  public toggleAutoScroll(): void {
    this.patch({ isAutoScrolling: !this.snapshot.isAutoScrolling });
  }

  public startAutoScroll(): void {
    this.patch({ isAutoScrolling: true });
  }

  public stopAutoScroll(): void {
    this.patch({ isAutoScrolling: false });
  }

  public setAutoScrollSpeed(pxPerSec: number): void {
    const clamped = Math.max(15, Math.min(120, Math.round(Number(pxPerSec) || 40)));
    this.patch({ autoScrollSpeedPxPerSec: clamped });
  }

  public transposeChordName(chord: string, semitones: number): string {
    return this.transposeService.transposeChord(chord, semitones);
  }

  private patch(partial: Partial<PlayerState>): void {
    this.stateSubject.next({ ...this.snapshot, ...partial });
  }
}
