import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { getApiBaseUrl } from '../helpers/api-config.helper';
import { Song, InstrumentTrack, SongSummary, CreateSongPayload, CreateTrackPayload } from '../models/song.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SongService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${getApiBaseUrl()}/songs`;

  private currentSongSubject = new BehaviorSubject<Song | null>(null);
  public currentSong$: Observable<Song | null> = this.currentSongSubject.asObservable();

  private songsListSubject = new BehaviorSubject<SongSummary[]>([]);
  public songsList$: Observable<SongSummary[]> = this.songsListSubject.asObservable();

  public getCurrentSongValue(): Song | null {
    return this.currentSongSubject.getValue();
  }

  public loadSongs(): Observable<SongSummary[]> {
    const userId = this.authService.getCurrentUserValue()?.userId;
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return this.http.get<SongSummary[]>(`${this.apiUrl}${query}`).pipe(
      tap(songs => this.songsListSubject.next(songs))
    );
  }

  public loadSong(id: number): Observable<Song> {
    return this.http.get<Song>(`${this.apiUrl}/${id}`).pipe(
      tap(song => this.currentSongSubject.next(song))
    );
  }

  public createSong(songData: CreateSongPayload): Observable<Song> {
    const user = this.authService.getCurrentUserValue();
    const payload: CreateSongPayload = {
      ...songData,
      creatorUserId: user?.userId || songData.creatorUserId || null,
      creatorName: user ? (user.displayName || user.username) : (songData.creatorName || null)
    };
    return this.http.post<Song>(this.apiUrl, payload, { headers: this.authService.getAuthHeaders() }).pipe(
      tap(newSong => {
        this.currentSongSubject.next(newSong);
        this.loadSongs().subscribe();
      })
    );
  }

  public updateSong(id: number, songData: CreateSongPayload): Observable<Song> {
    const user = this.authService.getCurrentUserValue();
    const payload: CreateSongPayload = {
      ...songData,
      creatorUserId: user?.userId || songData.creatorUserId || null,
      creatorName: user ? (user.displayName || user.username) : (songData.creatorName || null)
    };
    return this.http.put<Song>(`${this.apiUrl}/${id}`, payload, { headers: this.authService.getAuthHeaders() }).pipe(
      tap(updatedSong => {
        this.currentSongSubject.next(updatedSong);
        this.loadSongs().subscribe();
      })
    );
  }

  public updateSongVisibility(id: number, isPublic: boolean): Observable<{ id: number; isPublic: boolean }> {
    const user = this.authService.getCurrentUserValue();
    return this.http.patch<{ id: number; isPublic: boolean }>(
      `${this.apiUrl}/${id}/visibility`,
      { isPublic, creatorUserId: user?.userId || null },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(res => {
        const current = this.currentSongSubject.getValue();
        if (current && current.id === id) {
          this.currentSongSubject.next({ ...current, isPublic: res.isPublic });
        }
        this.loadSongs().subscribe();
      })
    );
  }

  public addTrack(songId: number, trackData: CreateTrackPayload): Observable<InstrumentTrack> {
    return this.http.post<InstrumentTrack>(
      `${this.apiUrl}/${songId}/tracks`,
      trackData,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(newTrack => {
        const currentSong = this.currentSongSubject.getValue();
        if (currentSong && currentSong.id === songId) {
          currentSong.tracks.push(newTrack);
          this.currentSongSubject.next({ ...currentSong });
        }
      })
    );
  }

  public seedDemoSong(): Observable<Song> {
    return this.http.post<Song>(`${this.apiUrl}/seed`, {}).pipe(
      tap(song => {
        this.currentSongSubject.next(song);
        this.loadSongs().subscribe();
      })
    );
  }
}
