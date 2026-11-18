import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { getApiBaseUrl } from '../helpers/api-config.helper';
import {
  PlaylistSummary,
  PlaylistDetail,
  Voter,
  VoteResponse,
  GeneratePlaylistPayload,
  GeneratePlaylistResponse,
  UpdatePlaylistSettingsPayload,
  ImportTrackToSongResponse,
  BatchImportToSongsResponse
} from '../models/playlist.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly baseUrl = getApiBaseUrl();

  private playlistsSubject = new BehaviorSubject<PlaylistSummary[]>([]);
  public playlists$ = this.playlistsSubject.asObservable();

  private sharedPlaylistsSubject = new BehaviorSubject<PlaylistSummary[]>([]);
  public sharedPlaylists$ = this.sharedPlaylistsSubject.asObservable();

  private currentPlaylistSubject = new BehaviorSubject<PlaylistDetail | null>(null);
  public currentPlaylist$ = this.currentPlaylistSubject.asObservable();

  private votersSubject = new BehaviorSubject<Voter[]>([]);
  public voters$ = this.votersSubject.asObservable();

  public getCurrentPlaylistValue(): PlaylistDetail | null {
    return this.currentPlaylistSubject.getValue();
  }

  public setVotersList(voters: Voter[]): void {
    this.votersSubject.next(voters);
  }

  public loadPlaylists(): Observable<PlaylistSummary[]> {
    const userId = this.authService.getCurrentUserValue()?.userId;
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return this.http.get<PlaylistSummary[]>(`${this.baseUrl}/playlists${query}`).pipe(
      tap(list => this.playlistsSubject.next(list))
    );
  }

  public loadSharedPlaylists(): Observable<PlaylistSummary[]> {
    const userId = this.authService.getCurrentUserValue()?.userId;
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return this.http.get<PlaylistSummary[]>(`${this.baseUrl}/playlists/shared${query}`).pipe(
      tap(list => this.sharedPlaylistsSubject.next(list))
    );
  }

  public loadPlaylist(id: number): Observable<PlaylistDetail> {
    return this.http.get<PlaylistDetail>(`${this.baseUrl}/playlists/${id}`).pipe(
      tap(playlist => this.currentPlaylistSubject.next(playlist))
    );
  }

  public updatePlaylistSettings(id: number, payload: UpdatePlaylistSettingsPayload): Observable<PlaylistDetail> {
    return this.http.put<PlaylistDetail>(
      `${this.baseUrl}/playlists/${id}/settings`,
      payload,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(playlist => {
        this.currentPlaylistSubject.next(playlist);
        this.loadPlaylists().subscribe();
        this.loadSharedPlaylists().subscribe();
        this.loadVoters().subscribe();
      })
    );
  }

  public seedDefaultPlaylist(): Observable<PlaylistDetail> {
    return this.http.post<PlaylistDetail>(`${this.baseUrl}/playlists/seed-default`, {}).pipe(
      tap(playlist => {
        this.currentPlaylistSubject.next(playlist);
        this.loadPlaylists().subscribe();
        this.loadSharedPlaylists().subscribe();
      })
    );
  }

  public importPlaylist(
    playlistUrl: string,
    profileName?: string,
    isSharedOnHome = true,
    votingEnabled = false,
    externalUserId?: string | null,
    externalProfileId?: number | null,
    organizationName?: string | null
  ): Observable<PlaylistDetail> {
    return this.http.post<PlaylistDetail>(
      `${this.baseUrl}/playlists/import`,
      {
        playlistUrl,
        profileName,
        externalUserId,
        externalProfileId,
        organizationName,
        isSharedOnHome,
        votingEnabled
      },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(playlist => {
        this.currentPlaylistSubject.next(playlist);
        this.loadPlaylists().subscribe();
        this.loadSharedPlaylists().subscribe();
        this.loadVoters().subscribe();
      })
    );
  }

  public importTrackToSong(
    playlistId: number,
    trackId: number,
    isPublic = true
  ): Observable<ImportTrackToSongResponse> {
    const user = this.authService.getCurrentUserValue();
    const params = `?isPublic=${isPublic}&creatorUserId=${encodeURIComponent(user?.userId || '')}&creatorName=${encodeURIComponent(user?.displayName || user?.username || '')}`;
    return this.http.post<ImportTrackToSongResponse>(
      `${this.baseUrl}/playlists/${playlistId}/tracks/${trackId}/import-to-song${params}`,
      {},
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(res => {
        const current = this.currentPlaylistSubject.getValue();
        if (current && current.id === playlistId) {
          const updatedTracks = current.tracks.map(t =>
            t.id === trackId ? { ...t, songId: res.songId } : t
          );
          const importedSongsCount = updatedTracks.filter(t => t.songId != null).length;
          this.currentPlaylistSubject.next({
            ...current,
            importedSongsCount,
            tracks: updatedTracks
          });
        }
        this.loadSharedPlaylists().subscribe();
      })
    );
  }

  public importBatchTracksToSongs(
    playlistId: number,
    onlyVoted = false,
    isPublic = true,
    trackIds?: number[]
  ): Observable<BatchImportToSongsResponse> {
    const user = this.authService.getCurrentUserValue();
    return this.http.post<BatchImportToSongsResponse>(
      `${this.baseUrl}/playlists/${playlistId}/import-to-songs`,
      {
        onlyVoted,
        trackIds,
        defaultInstrument: 'Violão',
        defaultKey: 'C',
        isPublic,
        creatorUserId: user?.userId || null,
        creatorName: user ? (user.displayName || user.username) : null
      },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(res => {
        if (res.playlist) {
          this.currentPlaylistSubject.next(res.playlist);
        }
        this.loadPlaylists().subscribe();
        this.loadSharedPlaylists().subscribe();
      })
    );
  }

  public loadVoters(): Observable<Voter[]> {
    return this.http.get<Voter[]>(`${this.baseUrl}/voters`).pipe(
      tap(voters => this.votersSubject.next(voters))
    );
  }

  public registerVoter(name: string): Observable<Voter> {
    return this.http.post<Voter>(
      `${this.baseUrl}/voters`,
      { name },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(() => this.loadVoters().subscribe())
    );
  }

  public toggleVote(playlistId: number, trackId: number, voterName: string): Observable<VoteResponse> {
    return this.http.post<VoteResponse>(
      `${this.baseUrl}/playlists/${playlistId}/tracks/${trackId}/vote`,
      { voterName },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(res => {
        if (res.allVoters) {
          this.votersSubject.next(res.allVoters);
        }
        const current = this.currentPlaylistSubject.getValue();
        if (current && current.id === playlistId) {
          const updatedTracks = current.tracks.map(t => {
            if (t.id === trackId) {
              return {
                ...t,
                votesCount: res.votesCount,
                voters: res.voters
              };
            }
            return t;
          });
          const totalVotes = updatedTracks.reduce((acc, item) => acc + item.votesCount, 0);
          this.currentPlaylistSubject.next({
            ...current,
            totalVotes,
            tracks: updatedTracks
          });
        }
        this.loadSharedPlaylists().subscribe();
      })
    );
  }

  public generatePlaylist(playlistId: number, payload: GeneratePlaylistPayload): Observable<GeneratePlaylistResponse> {
    return this.http.post<GeneratePlaylistResponse>(
      `${this.baseUrl}/playlists/${playlistId}/generate`,
      payload,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(() => {
        this.loadPlaylists().subscribe();
        this.loadSharedPlaylists().subscribe();
        this.loadVoters().subscribe();
      })
    );
  }
}
