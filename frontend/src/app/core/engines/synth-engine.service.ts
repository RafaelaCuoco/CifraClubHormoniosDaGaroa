import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subscription, combineLatest } from 'rxjs';
import { InstrumentConfig, SUPPORTED_INSTRUMENTS, getInstrumentConfig } from '../helpers/instrument-catalog';
import { PlayerStore } from '../stores/player.store';
import { SongStore } from '../stores/song.store';
import { TabColumn, TabMeasure, TabRenderer } from './tab-renderer.service';
import { TransposeService } from './transpose.service';

export interface SynthCursorFrame {
  continuousColumnPosition: number;
  colsPerMeasure: number;
  measureProgressPercent: number;
}

export interface SynthFrameState {
  config: InstrumentConfig;
  measures: TabMeasure[];
  allColumns: TabColumn[];
  colsPerMeasure: number;
  activeColumnIndex: number;
  continuousColumnPosition: number;
  currentMeasureIndex: number;
  currentBeatInMeasure: number;
  measureProgressPercent: number;
}

const INITIAL_FRAME_STATE: SynthFrameState = {
  config: SUPPORTED_INSTRUMENTS[0],
  measures: [],
  allColumns: [],
  colsPerMeasure: 4,
  activeColumnIndex: 0,
  continuousColumnPosition: 0,
  currentMeasureIndex: 0,
  currentBeatInMeasure: 1,
  measureProgressPercent: 0
};

/**
 * Motor puro de síntese Web Audio e agendamento rítmico a 60fps.
 * Não manipula o DOM.
 */
@Injectable({
  providedIn: 'root'
})
export class SynthEngine implements OnDestroy {
  private readonly playerStore = inject(PlayerStore);
  private readonly songStore = inject(SongStore);
  private readonly tabRenderer = inject(TabRenderer);
  private readonly transpose = inject(TransposeService);

  private readonly frameStateSubject = new BehaviorSubject<SynthFrameState>(INITIAL_FRAME_STATE);
  public readonly frameState$ = this.frameStateSubject.asObservable();

  private readonly cursorFrameSubject = new BehaviorSubject<SynthCursorFrame>({
    continuousColumnPosition: 0,
    colsPerMeasure: 4,
    measureProgressPercent: 0
  });
  public readonly cursorFrame$ = this.cursorFrameSubject.asObservable();

  private continuousColumnPosition = 0;

  private rafId: number | null = null;
  private lastAudioTimestampSec = 0;
  private nextScheduledColumnTimeSec = 0;
  private nextScheduledColumnIndex = 0;
  private readonly scheduleAheadTimeSec = 0.08;

  private audioCtx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private bpm = 120;
  private studySpeed = 1;
  private loopEnabled = true;
  private metronomeEnabled = false;
  private semitoneOffset = 0;
  private isPlaying = false;
  private lastStopNonce = 0;
  private lastBuiltTrackKey: string | null = null;

  private subs = new Subscription();

  constructor() {
    this.subs.add(
      combineLatest([this.songStore.activeTrack$, this.playerStore.instrument$]).subscribe(
        ([track, instrument]) => {
          const content = track?.content || '';
          const effectiveInst = instrument || track?.instrument || 'Violão';
          const buildKey = `${track?.id ?? 'none'}|${effectiveInst}|${content}`;
          if (buildKey === this.lastBuiltTrackKey) return;
          this.lastBuiltTrackKey = buildKey;
          this.rebuildTrack(content, effectiveInst);
        }
      )
    );

    this.subs.add(
      this.playerStore.state$.subscribe(state => {
        const tempoChanged = this.bpm !== state.bpm || this.studySpeed !== state.studySpeed;
        this.bpm = state.bpm;
        this.studySpeed = state.studySpeed;
        this.loopEnabled = state.loopEnabled;
        this.metronomeEnabled = state.metronomeEnabled;
        this.semitoneOffset = state.semitoneOffset;

        if (tempoChanged && this.isPlaying && this.audioCtx) {
          this.nextScheduledColumnTimeSec = Math.max(
            this.audioCtx.currentTime,
            this.nextScheduledColumnTimeSec
          );
        }

        if (state.isPlaying && !this.isPlaying && this.snapshot.allColumns.length > 0) {
          this.start();
        } else if (!state.isPlaying && this.isPlaying) {
          this.stopInternal(false);
        }
      })
    );

    this.subs.add(
      this.playerStore.stopSignal$.subscribe(nonce => {
        if (nonce > this.lastStopNonce) {
          this.lastStopNonce = nonce;
          this.stopInternal(true);
        }
      })
    );
  }

  public get snapshot(): SynthFrameState {
    return this.frameStateSubject.getValue();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.stopInternal(false);
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  public rebuildTrack(content: string, instrumentId: string): void {
    const resumeAfterRebuild = this.isPlaying || this.playerStore.snapshot.isPlaying;
    this.stopInternal(false);
    const rendered = this.tabRenderer.buildTabData(content, getInstrumentConfig(instrumentId).id);
    this.frameStateSubject.next({
      config: rendered.config,
      measures: rendered.measures,
      allColumns: rendered.allColumns,
      colsPerMeasure: rendered.colsPerMeasure,
      activeColumnIndex: 0,
      continuousColumnPosition: 0,
      currentMeasureIndex: 0,
      currentBeatInMeasure: 1,
      measureProgressPercent: 0
    });
    this.setCursorColumn(0, false);
    if (resumeAfterRebuild && rendered.allColumns.length > 0) {
      this.start();
    }
  }

  public selectAndPreviewColumn(colIndex: number): void {
    this.setCursorColumn(colIndex, true);
    if (this.isPlaying && this.audioCtx) {
      const s = this.snapshot;
      const secPerCol = this.getSecondsPerColumn(s.colsPerMeasure);
      this.nextScheduledColumnIndex = Math.min(colIndex + 1, s.allColumns.length);
      this.nextScheduledColumnTimeSec = this.audioCtx.currentTime + secPerCol;
    }
  }

  public togglePercussionCell(colIndex: number, stringIndex: number): void {
    const s = this.snapshot;
    if (s.config.category !== 'percussao') return;
    const col = s.allColumns[colIndex];
    if (!col) return;

    const existingIdx = col.notes.findIndex(n => n.stringIndex === stringIndex);
    if (existingIdx >= 0) {
      col.notes.splice(existingIdx, 1);
    } else {
      col.notes.push({ stringIndex, fret: 0, label: 'X' });
    }
    this.setCursorColumn(colIndex, true);
  }

  private setCursorColumn(colIndex: number, playAudio: boolean): void {
    const s = this.snapshot;
    if (s.allColumns.length === 0) {
      this.playerStore.setPlaybackProgress(1, 1, 1, null);
      return;
    }

    const safeIdx = Math.max(0, Math.min(s.allColumns.length - 1, colIndex));
    const colsPerM = Math.max(1, s.colsPerMeasure);
    const measureIdx = Math.floor(safeIdx / colsPerM);
    const posInMeasure = safeIdx % colsPerM;
    const beatInMeasure = Math.min(4, Math.floor((posInMeasure / colsPerM) * 4) + 1);
    const progressPct = Math.round(((posInMeasure + 0.5) / colsPerM) * 100);

    const activeMeasure = s.measures[measureIdx];
    const transposedChord = activeMeasure?.chordName
      ? this.transpose.transposeChord(activeMeasure.chordName, this.semitoneOffset)
      : null;

    this.continuousColumnPosition = safeIdx;
    this.cursorFrameSubject.next({
      continuousColumnPosition: safeIdx,
      colsPerMeasure: colsPerM,
      measureProgressPercent: progressPct
    });

    this.frameStateSubject.next({
      ...s,
      activeColumnIndex: safeIdx,
      continuousColumnPosition: safeIdx,
      currentMeasureIndex: measureIdx,
      currentBeatInMeasure: beatInMeasure,
      measureProgressPercent: progressPct
    });

    this.playerStore.setPlaybackProgress(
      measureIdx + 1,
      Math.max(1, s.measures.length),
      beatInMeasure,
      transposedChord
    );

    if (playAudio) {
      const col = s.allColumns[safeIdx];
      if (col) {
        this.playColumnAudio(col, false);
      }
    }
  }

  private start(): void {
    const s = this.snapshot;
    if (s.allColumns.length === 0 || typeof globalThis.AudioContext === 'undefined') return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    this.isPlaying = true;
    const nowAudio = ctx.currentTime;
    this.lastAudioTimestampSec = nowAudio;
    this.nextScheduledColumnIndex = s.activeColumnIndex;
    this.nextScheduledColumnTimeSec = nowAudio + 0.03;

    const animate = () => {
      if (!this.isPlaying || !this.audioCtx) return;

      const cur = this.snapshot;
      if (cur.allColumns.length === 0) {
        this.stopInternal(true);
        return;
      }

      const audioNow = this.audioCtx.currentTime;
      if (this.audioCtx.state === 'suspended') {
        this.lastAudioTimestampSec = audioNow;
        this.nextScheduledColumnTimeSec = audioNow + 0.03;
        this.rafId = requestAnimationFrame(animate);
        return;
      }

      const rawDt = Math.max(0, audioNow - this.lastAudioTimestampSec);
      const dtAudioSec = rawDt > 0.25 ? 0.016 : rawDt;
      this.lastAudioTimestampSec = audioNow;

      const secPerCol = this.getSecondsPerColumn(cur.colsPerMeasure);
      const colsPerSec = 1 / secPerCol;

      if (this.nextScheduledColumnTimeSec < audioNow - 0.1) {
        this.nextScheduledColumnTimeSec = audioNow + 0.015;
      }

      while (this.nextScheduledColumnTimeSec < audioNow + this.scheduleAheadTimeSec) {
        if (this.nextScheduledColumnIndex >= cur.allColumns.length) {
          if (this.loopEnabled) {
            this.nextScheduledColumnIndex = 0;
          } else {
            break;
          }
        }
        this.triggerStepAt(cur.allColumns, cur.colsPerMeasure, this.nextScheduledColumnIndex, this.nextScheduledColumnTimeSec);
        this.nextScheduledColumnTimeSec += secPerCol;
        this.nextScheduledColumnIndex++;
      }

      let nextPos = this.continuousColumnPosition + dtAudioSec * colsPerSec;
      if (nextPos >= cur.allColumns.length) {
        if (this.loopEnabled) {
          nextPos = nextPos % cur.allColumns.length;
        } else {
          this.stopInternal(true);
          this.playerStore.stop();
          return;
        }
      }

      this.continuousColumnPosition = nextPos;

      const visualColIdx = Math.min(cur.allColumns.length - 1, Math.floor(nextPos));
      const colsPerM = Math.max(1, cur.colsPerMeasure);
      const measureIdx = Math.min(
        Math.max(0, cur.measures.length - 1),
        Math.floor(nextPos / colsPerM)
      );
      const fracInMeasure = (nextPos % colsPerM) / colsPerM;
      const progressPct = Math.min(100, Math.round(fracInMeasure * 100));
      const beatInMeasure = Math.min(4, Math.floor(fracInMeasure * 4) + 1);

      // Atualiza apenas a posição do cursor a 60fps sem forçar re-render da grade inteira.
      this.cursorFrameSubject.next({
        continuousColumnPosition: nextPos,
        colsPerMeasure: colsPerM,
        measureProgressPercent: progressPct
      });

      // Só reemite o estado da grade quando muda coluna ativa, compasso ou batida.
      if (
        visualColIdx !== cur.activeColumnIndex ||
        measureIdx !== cur.currentMeasureIndex ||
        beatInMeasure !== cur.currentBeatInMeasure
      ) {
        const activeMeasure = cur.measures[measureIdx];
        const transposedChord = activeMeasure?.chordName
          ? this.transpose.transposeChord(activeMeasure.chordName, this.semitoneOffset)
          : null;

        this.frameStateSubject.next({
          ...cur,
          activeColumnIndex: visualColIdx,
          continuousColumnPosition: nextPos,
          currentMeasureIndex: measureIdx,
          currentBeatInMeasure: beatInMeasure,
          measureProgressPercent: progressPct
        });

        this.playerStore.setPlaybackProgress(
          measureIdx + 1,
          Math.max(1, cur.measures.length),
          beatInMeasure,
          transposedChord
        );
      }

      this.rafId = requestAnimationFrame(animate);
    };

    this.rafId = requestAnimationFrame(animate);
  }

  private stopInternal(resetCursor: boolean): void {
    this.isPlaying = false;
    if (this.rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (resetCursor) {
      this.setCursorColumn(0, false);
    }
  }

  private getSecondsPerColumn(colsPerMeasure: number): number {
    const effectiveBpm = Math.max(30, (this.bpm || 120) * (this.studySpeed || 1));
    const beatsPerSec = effectiveBpm / 60;
    const colsPerSec = beatsPerSec * (Math.max(1, colsPerMeasure) / 4);
    return 1 / Math.max(0.1, colsPerSec);
  }

  private triggerStepAt(
    columns: TabColumn[],
    colsPerMeasure: number,
    colIndex: number,
    scheduledTimeSec?: number
  ): void {
    const col = columns[colIndex];
    if (!col) return;
    const beatStep = Math.max(1, Math.floor(colsPerMeasure / 4));
    const isBeatStart = colIndex % beatStep === 0;
    this.playColumnAudio(col, this.metronomeEnabled && isBeatStart, scheduledTimeSec);
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof globalThis === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        globalThis.AudioContext || (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    if (this.audioCtx && !this.noiseBuffer) {
      const bufferSize = this.audioCtx.sampleRate * 1.0;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.audioCtx;
  }

  private playColumnAudio(col: TabColumn, playMetronomeClick: boolean, scheduledTimeSec?: number): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    const config = this.snapshot.config;
    const now = scheduledTimeSec !== undefined ? Math.max(ctx.currentTime, scheduledTimeSec) : ctx.currentTime;

    if (playMetronomeClick) {
      const colsPerM = Math.max(1, this.snapshot.colsPerMeasure);
      const isDownbeat = col.index % colsPerM === 0;
      this.triggerClickSound(ctx, now, isDownbeat ? 1250 : 850, 0.08);
    }

    if (!col.notes || col.notes.length === 0) return;

    if (config.category === 'percussao') {
      col.notes.forEach(note => {
        this.playPercussionArticulation(ctx, now, config.id, note.stringIndex);
      });
      return;
    }

    col.notes.forEach((note, idx) => {
      const baseFreq = config.baseFreqs[note.stringIndex] || 110;
      const effectiveFret = this.transpose.transposeFret(note.fret, this.semitoneOffset);
      const freq = baseFreq * Math.pow(2, effectiveFret / 12);
      const startTime = now + idx * (config.id === 'Teclado' ? 0.003 : 0.012);
      this.playMelodicNote(ctx, startTime, freq, config.id, col.notes.length);
    });
  }

  private playMelodicNote(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    instId: string,
    chordSize: number
  ): void {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const normAmp = 0.18 / Math.sqrt(Math.max(1, chordSize));

    if (instId === 'Cavaquinho') {
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 2, startTime);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, startTime);
      filter.Q.setValueAtTime(1.2, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(normAmp * 1.15, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.36);
      this.connectAndRunOscs(ctx, [osc1, osc2], filter, gain, startTime, 0.38);
      return;
    }

    if (instId === 'Baixo') {
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 2, startTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(normAmp * 1.4, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.72);
      this.connectAndRunOscs(ctx, [osc1, osc2], filter, gain, startTime, 0.75);
      return;
    }

    if (instId === 'Teclado') {
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 2.002, startTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(normAmp * 1.1, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.85);
      this.connectAndRunOscs(ctx, [osc1, osc2], filter, gain, startTime, 0.88);
      return;
    }

    if (instId === 'Escaleta') {
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 1.003, startTime);
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(5.5, startTime);
      lfoGain.gain.setValueAtTime(3.0, startTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1450, startTime);
      filter.Q.setValueAtTime(1.5, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(normAmp * 0.9, startTime + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.65);
      lfo.start(startTime);
      lfo.stop(startTime + 0.68);
      this.connectAndRunOscs(ctx, [osc1, osc2], filter, gain, startTime, 0.68);
      return;
    }

    osc1.type = instId === 'Guitarra' ? 'sawtooth' : 'triangle';
    osc2.type = instId === 'Guitarra' ? 'triangle' : 'sawtooth';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(instId === 'Guitarra' ? 2500 : 1850, startTime);
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(normAmp, startTime + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.65);
    this.connectAndRunOscs(ctx, [osc1, osc2], filter, gain, startTime, 0.68);
  }

  private connectAndRunOscs(
    ctx: AudioContext,
    oscs: OscillatorNode[],
    filter: BiquadFilterNode,
    gain: GainNode,
    startTime: number,
    duration: number
  ): void {
    oscs.forEach(o => o.connect(filter));
    filter.connect(gain);
    gain.connect(ctx.destination);
    oscs.forEach(o => {
      o.start(startTime);
      o.stop(startTime + duration);
    });
  }

  private playPercussionArticulation(ctx: AudioContext, now: number, instId: string, lineIdx: number): void {
    if (instId === 'Agogô') {
      const bellFreqs = [880.0, 739.99, 587.33, 440.0, 1320.0, 659.25];
      const baseF = bellFreqs[lineIdx] || 660;
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const mainGain = ctx.createGain();
      carrier.type = 'sine';
      modulator.type = 'square';
      carrier.frequency.setValueAtTime(baseF, now);
      modulator.frequency.setValueAtTime(baseF * 2.41, now);
      modGain.gain.setValueAtTime(baseF * 0.8, now);
      modGain.gain.exponentialRampToValueAtTime(1, now + 0.18);
      mainGain.gain.setValueAtTime(0.22, now);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + (lineIdx === 5 ? 0.08 : 0.28));
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(mainGain);
      mainGain.connect(ctx.destination);
      carrier.start(now);
      modulator.start(now);
      carrier.stop(now + 0.3);
      modulator.stop(now + 0.3);
      return;
    }

    if (instId === 'Tamborim') {
      const pitches = [680, 590, 520, 620, 570, 460];
      const f = pitches[lineIdx] || 600;
      this.triggerMembraneDrum(ctx, now, f * 1.25, f, 0.09, 0.24, 'triangle');
      this.triggerNoiseBurst(ctx, now, 3200, 2.5, 0.055, 0.16);
      return;
    }

    if (instId === 'Caixa') {
      const bodyPitch = lineIdx === 0 ? 340 : 230;
      const noiseDur = lineIdx === 4 ? 0.06 : 0.17;
      const noiseAmp = lineIdx === 4 ? 0.07 : lineIdx <= 1 ? 0.24 : 0.14;
      this.triggerMembraneDrum(ctx, now, bodyPitch * 1.3, bodyPitch, 0.1, 0.18, 'triangle');
      this.triggerNoiseBurst(ctx, now, 2400, 1.1, noiseDur, noiseAmp);
      return;
    }

    if (instId === 'Repinique') {
      if (lineIdx === 0) {
        this.triggerClickSound(ctx, now, 1450, 0.22);
        this.triggerMembraneDrum(ctx, now, 480, 390, 0.12, 0.18, 'triangle');
      } else if (lineIdx === 2 || lineIdx === 3) {
        const p = lineIdx === 2 ? 360 : 250;
        this.triggerMembraneDrum(ctx, now, p * 1.15, p, 0.16, 0.24, 'sine');
      } else {
        this.triggerMembraneDrum(ctx, now, 460, 360, 0.14, 0.22, 'triangle');
        this.triggerNoiseBurst(ctx, now, 2800, 2.0, 0.04, 0.1);
      }
      return;
    }

    if (instId === 'Timbal') {
      if (lineIdx === 0) {
        this.triggerMembraneDrum(ctx, now, 580, 420, 0.1, 0.24, 'triangle');
        this.triggerNoiseBurst(ctx, now, 3000, 2.2, 0.05, 0.2);
      } else if (lineIdx === 1) {
        this.triggerMembraneDrum(ctx, now, 310, 275, 0.28, 0.26, 'sine');
      } else if (lineIdx === 3) {
        this.triggerMembraneDrum(ctx, now, 150, 98, 0.26, 0.32, 'sine');
      } else {
        this.triggerMembraneDrum(ctx, now, 240, 190, 0.12, 0.2, 'triangle');
      }
      return;
    }

    if (instId === 'Alfaia') {
      if (lineIdx === 0 || lineIdx === 4) {
        this.triggerClickSound(ctx, now, 950, 0.18);
        this.triggerMembraneDrum(ctx, now, 260, 190, 0.11, 0.2, 'triangle');
      } else {
        const deepPitch = lineIdx === 2 || lineIdx === 5 ? 62 : 82;
        this.triggerMembraneDrum(ctx, now, deepPitch * 1.8, deepPitch, 0.38, 0.36, 'sine');
      }
      return;
    }

    if (instId === 'Surdo de Primeira' || instId === 'Surdo de Segunda' || instId === 'Surdo de Terceira') {
      const cfgMap: Record<string, { muted: number; rim: number; open: number; alt: number }> = {
        'Surdo de Primeira': { muted: 115, rim: 880, open: 55, alt: 49 },
        'Surdo de Segunda': { muted: 135, rim: 960, open: 73.4, alt: 82 },
        'Surdo de Terceira': { muted: 185, rim: 1100, open: 108, alt: 98 }
      };
      const sc = cfgMap[instId];
      if (lineIdx === 0) {
        this.triggerMembraneDrum(ctx, now, sc.muted, sc.muted * 0.65, 0.08, 0.15, 'triangle');
        this.triggerNoiseBurst(ctx, now, 1050, 1.8, 0.04, 0.06);
      } else if (lineIdx === 3 || (instId === 'Surdo de Terceira' && lineIdx === 4)) {
        this.triggerClickSound(ctx, now, sc.rim, 0.16);
      } else {
        const pitch = lineIdx >= 2 ? sc.alt : sc.open;
        this.triggerMembraneDrum(ctx, now, pitch * 1.7, pitch, 0.4, 0.38, 'sine');
      }
      return;
    }

    // Bateria Completa
    if (lineIdx === 0) this.triggerNoiseBurst(ctx, now, 7500, 3.0, 0.055, 0.14);
    else if (lineIdx === 1) this.triggerNoiseBurst(ctx, now, 5200, 1.2, 0.42, 0.18);
    else if (lineIdx === 2) {
      this.triggerMembraneDrum(ctx, now, 240, 175, 0.12, 0.2, 'triangle');
      this.triggerNoiseBurst(ctx, now, 2200, 1.0, 0.16, 0.22);
    } else if (lineIdx === 3) this.triggerMembraneDrum(ctx, now, 190, 135, 0.24, 0.25, 'sine');
    else if (lineIdx === 4) this.triggerMembraneDrum(ctx, now, 130, 88, 0.32, 0.28, 'sine');
    else this.triggerMembraneDrum(ctx, now, 135, 52, 0.25, 0.38, 'sine');
  }

  private triggerMembraneDrum(
    ctx: AudioContext,
    now: number,
    startFreq: number,
    endFreq: number,
    duration: number,
    amp: number,
    type: OscillatorType
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration * 0.65);
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private triggerNoiseBurst(
    ctx: AudioContext,
    now: number,
    filterFreq: number,
    q: number,
    duration: number,
    amp: number
  ): void {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterFreq > 4500 ? 'highpass' : 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(q, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  private triggerClickSound(ctx: AudioContext, now: number, freq: number, amp: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }
}
