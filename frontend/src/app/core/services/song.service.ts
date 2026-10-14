import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest, map, tap } from 'rxjs';
import { Song, InstrumentTrack, SongSummary, CreateSongPayload, CreateTrackPayload } from '../models/song.model';

const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

@Injectable({
  providedIn: 'root'
})
export class SongService {
  private http = inject(HttpClient);

  private get apiUrl(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('rafaelacuoco.com.br')) {
        return 'https://cifratransback.rafaelacuoco.com.br/api/songs';
      }
    }
    return 'http://localhost:5512/api/songs';
  }

  // 1. Gerenciamento da Música Atual
  private currentSongSubject = new BehaviorSubject<Song | null>(null);
  public currentSong$: Observable<Song | null> = this.currentSongSubject.asObservable();

  // 2. Gerenciamento do Tom e Transposição (offset em semitons: -11 a +11)
  private semitoneOffsetSubject = new BehaviorSubject<number>(0);
  public semitoneOffset$: Observable<number> = this.semitoneOffsetSubject.asObservable();

  // Tom calculado reativamente a partir do originalKey e do semitoneOffset
  public currentKey$: Observable<string> = combineLatest([
    this.currentSongSubject,
    this.semitoneOffsetSubject
  ]).pipe(
    map(([song, offset]) => {
      if (!song || !song.originalKey) return 'C';
      return this.transposeChordName(song.originalKey, offset);
    })
  );

  // 3. Gerenciamento do Instrumento Ativo
  private activeInstrumentSubject = new BehaviorSubject<string>('Violão');
  public activeInstrument$: Observable<string> = this.activeInstrumentSubject.asObservable();

  // Faixa do instrumento selecionado atualmente reativa a mudanças de música e instrumento
  public activeTrack$: Observable<InstrumentTrack | null> = combineLatest([
    this.currentSongSubject,
    this.activeInstrumentSubject
  ]).pipe(
    map(([song, instrument]) => {
      if (!song || !song.tracks || song.tracks.length === 0) return null;
      return song.tracks.find(t => t.instrument.toLowerCase() === instrument.toLowerCase()) || song.tracks[0];
    })
  );

  // 4. Gerenciamento da Rolagem Automática
  private scrollSpeedSubject = new BehaviorSubject<number>(1); // 1 = normal, 2 = rápido, 3 = veloz
  public scrollSpeed$: Observable<number> = this.scrollSpeedSubject.asObservable();

  private isAutoScrollingSubject = new BehaviorSubject<boolean>(false);
  public isAutoScrolling$: Observable<boolean> = this.isAutoScrollingSubject.asObservable();

  // Lista de músicas disponíveis
  private songsListSubject = new BehaviorSubject<SongSummary[]>([]);
  public songsList$: Observable<SongSummary[]> = this.songsListSubject.asObservable();

  public getCurrentSongValue(): Song | null {
    return this.currentSongSubject.getValue();
  }

  public getActiveTrackValue(): InstrumentTrack | null {
    const song = this.currentSongSubject.getValue();
    if (!song || !song.tracks || song.tracks.length === 0) return null;
    const inst = this.activeInstrumentSubject.getValue();
    return song.tracks.find(t => t.instrument.toLowerCase() === inst.toLowerCase()) || song.tracks[0];
  }

  // --- MÉTODOS DE API ---

  public loadSongs(): Observable<SongSummary[]> {
    return this.http.get<SongSummary[]>(this.apiUrl).pipe(
      tap(songs => this.songsListSubject.next(songs))
    );
  }

  public loadSong(id: number): Observable<Song> {
    return this.http.get<Song>(`${this.apiUrl}/${id}`).pipe(
      tap(song => {
        this.currentSongSubject.next(song);
        this.semitoneOffsetSubject.next(0); // Reinicia transposição ao carregar nova música
        if (song.tracks && song.tracks.length > 0) {
          this.activeInstrumentSubject.next(song.tracks[0].instrument);
        }
      })
    );
  }

  public createSong(songData: CreateSongPayload): Observable<Song> {
    return this.http.post<Song>(this.apiUrl, songData).pipe(
      tap(newSong => {
        this.currentSongSubject.next(newSong);
        this.loadSongs().subscribe();
      })
    );
  }

  public updateSong(id: number, songData: CreateSongPayload): Observable<Song> {
    return this.http.put<Song>(`${this.apiUrl}/${id}`, songData).pipe(
      tap(updatedSong => {
        this.currentSongSubject.next(updatedSong);
        this.loadSongs().subscribe();
      })
    );
  }

  public addTrack(songId: number, trackData: CreateTrackPayload): Observable<InstrumentTrack> {
    return this.http.post<InstrumentTrack>(`${this.apiUrl}/${songId}/tracks`, trackData).pipe(
      tap(newTrack => {
        const currentSong = this.currentSongSubject.getValue();
        if (currentSong && currentSong.id === songId) {
          currentSong.tracks.push(newTrack);
          this.currentSongSubject.next({ ...currentSong });
          this.activeInstrumentSubject.next(newTrack.instrument);
        }
      })
    );
  }

  public seedDemoSong(): Observable<Song> {
    return this.http.post<Song>(`${this.apiUrl}/seed`, {}).pipe(
      tap(song => {
        this.currentSongSubject.next(song);
        this.semitoneOffsetSubject.next(0);
        if (song.tracks && song.tracks.length > 0) {
          this.activeInstrumentSubject.next(song.tracks[0].instrument);
        }
        this.loadSongs().subscribe();
      })
    );
  }

  // --- MÉTODOS DE CONTROLE DE TRANSPOSIÇÃO ---

  public transposeUp(): void {
    const nextOffset = (this.semitoneOffsetSubject.getValue() + 1) % 12;
    this.semitoneOffsetSubject.next(nextOffset);
  }

  public transposeDown(): void {
    let nextOffset = (this.semitoneOffsetSubject.getValue() - 1) % 12;
    if (nextOffset < -11) nextOffset = 0;
    this.semitoneOffsetSubject.next(nextOffset);
  }

  public resetTranspose(): void {
    this.semitoneOffsetSubject.next(0);
  }

  // --- MÉTODOS DE CONTROLE DE INSTRUMENTO ---

  public setActiveInstrument(instrument: string): void {
    this.activeInstrumentSubject.next(instrument);
  }

  // --- MÉTODOS DE CONTROLE DE ROLAGEM AUTOMÁTICA ---

  public setScrollSpeed(speed: number): void {
    this.scrollSpeedSubject.next(Math.max(1, Math.min(5, speed)));
  }

  public toggleAutoScroll(): void {
    this.isAutoScrollingSubject.next(!this.isAutoScrollingSubject.getValue());
  }

  public stopAutoScroll(): void {
    this.isAutoScrollingSubject.next(false);
  }

  public startAutoScroll(): void {
    this.isAutoScrollingSubject.next(true);
  }

  // --- UTILITÁRIO DE TRANSPOSIÇÃO DE NOTAS/ACORDES ---

  public transposeChordName(chord: string, semitones: number): string {
    if (semitones === 0 || !chord) return chord;

    // Normaliza acidentes comuns (ex: Db -> C#)
    const normalized = chord.replace('Db', 'C#')
                            .replace('Eb', 'D#')
                            .replace('Gb', 'F#')
                            .replace('Ab', 'G#')
                            .replace('Bb', 'A#');

    const match = normalized.match(/^([A-G][#]?)(.*)/);
    if (!match) return chord;

    const root = match[1];
    const suffix = match[2];

    const rootIndex = CHROMATIC_SCALE.indexOf(root);
    if (rootIndex === -1) return chord;

    const newIndex = (rootIndex + semitones + 120) % 12;
    return CHROMATIC_SCALE[newIndex] + suffix;
  }
}
