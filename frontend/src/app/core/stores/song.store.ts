import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, distinctUntilChanged, map, tap, catchError, throwError } from 'rxjs';
import {
  CreateSongPayload,
  CreateTrackPayload,
  InstrumentTrack,
  Song,
  SongSummary
} from '../models/song.model';
import { SongService } from '../services/song.service';
import { PlayerStore } from './player.store';

@Injectable({
  providedIn: 'root'
})
export class SongStore {
  private readonly songService = inject(SongService);
  private readonly playerStore = inject(PlayerStore);

  private readonly loadingListSubject = new BehaviorSubject<boolean>(false);
  public readonly loadingList$ = this.loadingListSubject.asObservable();

  private readonly loadingSongSubject = new BehaviorSubject<boolean>(false);
  public readonly loadingSong$ = this.loadingSongSubject.asObservable();

  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  public readonly error$ = this.errorSubject.asObservable();

  public readonly songsList$: Observable<SongSummary[]> = this.songService.songsList$;
  public readonly currentSong$: Observable<Song | null> = this.songService.currentSong$;

  public readonly activeTrack$: Observable<InstrumentTrack | null> = combineLatest([
    this.currentSong$,
    this.playerStore.instrument$
  ]).pipe(
    map(([song, instrument]) => {
      if (!song || !song.tracks || song.tracks.length === 0) return null;
      return (
        song.tracks.find(t => t.instrument.toLowerCase() === instrument.toLowerCase()) ||
        song.tracks[0]
      );
    }),
    distinctUntilChanged(
      (a, b) => a?.id === b?.id && a?.instrument === b?.instrument && a?.content === b?.content
    )
  );

  public getCurrentSong(): Song | null {
    return this.songService.getCurrentSongValue();
  }

  public getActiveTrack(): InstrumentTrack | null {
    const song = this.getCurrentSong();
    if (!song || !song.tracks || song.tracks.length === 0) return null;
    const inst = this.playerStore.snapshot.instrument;
    return (
      song.tracks.find(t => t.instrument.toLowerCase() === inst.toLowerCase()) ||
      song.tracks[0]
    );
  }

  public loadSongs(): Observable<SongSummary[]> {
    this.loadingListSubject.next(true);
    this.errorSubject.next(null);
    return this.songService.loadSongs().pipe(
      tap(() => this.loadingListSubject.next(false)),
      catchError(err => {
        this.loadingListSubject.next(false);
        this.errorSubject.next(err?.error?.message || 'Não foi possível carregar o catálogo de cifras.');
        return throwError(() => err);
      })
    );
  }

  public loadSong(id: number): Observable<Song> {
    this.loadingSongSubject.next(true);
    this.errorSubject.next(null);
    return this.songService.loadSong(id).pipe(
      tap(song => {
        this.loadingSongSubject.next(false);
        const shouldAutoPlay = this.playerStore.consumePendingPlay();
        this.playerStore.syncFromSong(song);
        if (shouldAutoPlay && song.tracks && song.tracks.length > 0) {
          this.playerStore.play();
        }
      }),
      catchError(err => {
        this.loadingSongSubject.next(false);
        this.errorSubject.next(err?.error?.message || 'Não foi possível carregar a cifra selecionada.');
        return throwError(() => err);
      })
    );
  }

  public createSong(payload: CreateSongPayload): Observable<Song> {
    return this.songService.createSong(payload).pipe(
      tap(song => this.playerStore.syncFromSong(song))
    );
  }

  public updateSong(id: number, payload: CreateSongPayload): Observable<Song> {
    return this.songService.updateSong(id, payload).pipe(
      tap(song => this.playerStore.syncFromSong(song))
    );
  }

  public updateSongVisibility(id: number, isPublic: boolean): Observable<{ id: number; isPublic: boolean }> {
    return this.songService.updateSongVisibility(id, isPublic);
  }

  public addTrack(songId: number, trackData: CreateTrackPayload): Observable<InstrumentTrack> {
    return this.songService.addTrack(songId, trackData).pipe(
      tap(track => this.playerStore.setInstrument(track.instrument))
    );
  }

  public seedDemoSong(): Observable<Song> {
    return this.songService.seedDemoSong().pipe(
      tap(song => this.playerStore.syncFromSong(song))
    );
  }
}
