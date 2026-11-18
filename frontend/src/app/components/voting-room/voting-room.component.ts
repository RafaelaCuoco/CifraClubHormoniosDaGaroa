import { Component, OnInit, OnDestroy, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PlaylistService } from '../../core/services/playlist.service';
import { AuthService } from '../../core/services/auth.service';
import { SongStore } from '../../core/stores/song.store';
import { AuthStore } from '../../core/stores/auth.store';
import { PlayerStore } from '../../core/stores/player.store';
import { UiStore } from '../../core/stores/ui.store';
import {
  PlaylistDetail,
  PlaylistTrack,
  TransicionaisUserSession
} from '../../core/models/playlist.model';
import {
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  EmptyStateComponent,
  IconButtonComponent,
  IconComponent,
  PT_BR_GLOSSARY,
  ToggleComponent
} from '../../design-system';
import { AuthGateComponent } from '../auth/auth-gate.component';
import { VisibilityBadgeComponent } from '../visibility-badge/visibility-badge.component';
import { canManagePlaylistVisibility } from '../../core/helpers/permission.helper';

export interface OpenSongFromPlaylistEvent {
  songId: number;
  createdNew: boolean;
  playlistId: number;
  playlistName: string;
}

@Component({
  selector: 'app-voting-room',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    ButtonComponent,
    IconButtonComponent,
    BadgeComponent,
    CardComponent,
    EmptyStateComponent,
    ToggleComponent,
    AuthGateComponent,
    VisibilityBadgeComponent
  ],
  templateUrl: './voting-room.component.html'
})
export class VotingRoomComponent implements OnInit, OnDestroy {
  public playlistService = inject(PlaylistService);
  public songStore = inject(SongStore);
  public authStore = inject(AuthStore);
  public authService = inject(AuthService);
  private playerStore = inject(PlayerStore);
  private uiStore = inject(UiStore);
  private router = inject(Router);
  public readonly glossary = PT_BR_GLOSSARY;
  private subs = new Subscription();

  @Output() openSongInViewer = new EventEmitter<OpenSongFromPlaylistEvent>();

  public playlistUrlInput = 'https://open.spotify.com/playlist/6q8HxGekCdXiI87fJzxWR4?si=vPTxbtBUTauY_lX4MbIZpg';
  public activeVoterName = '';
  public searchTerm = '';
  public sortMode: 'ranking' | 'original' = 'original';
  public filterOnlyVoted = false;

  // Perfil Transicionais, Visibilidade Pública/Privada e Votação Opcional
  public profileNameInput = '';
  public descriptionInput = '';
  public isSharedOnHomeInput = true;
  public importedSongsPublicInput = true;
  public votingEnabledInput = false;
  public isSavingSettings = false;
  public isSyncingMembers = false;

  public isImporting = false;
  public isGenerating = false;
  public isBatchImportingSongs = false;
  public importingTrackId: number | null = null;
  public votingTrackId: number | null = null;

  public feedbackMessage = '';
  public errorMessage = '';

  // Configuração de geração de nova playlist
  public showGeneratePanel = false;
  public newPlaylistName = 'Hormônios 2027 - Selecionadas';
  public minVotesFilter = 1;
  public topLimitFilter: number | null = null;
  public generateImportToSongs = true;

  // Player de prévia de áudio (30s Spotify)
  public playingTrackId: number | null = null;
  private audioPlayer: HTMLAudioElement | null = null;

  ngOnInit(): void {
    this.playlistService.loadVoters().subscribe();

    this.authService.currentUser$.subscribe(user => {
      if (user) {
        if (!this.activeVoterName.trim()) {
          this.activeVoterName = user.displayName || user.username;
        }
        this.profileNameInput = user.displayName || user.username;
        this.playlistService.loadPlaylists().subscribe();
        this.playlistService.loadSharedPlaylists().subscribe();
        this.playlistService.loadVoters().subscribe();
      }
    });

    this.playlistService.currentPlaylist$.subscribe(current => {
      if (current) {
        this.syncLocalSettingsFromPlaylist(current);
      }
    });

    this.subs.add(
      this.playerStore.isPlaying$.subscribe(isPlaying => {
        if (isPlaying) {
          this.stopPreview();
        }
      })
    );

    this.playlistService.loadPlaylists().subscribe({
      next: (playlists) => {
        if (playlists && playlists.length > 0) {
          const current = this.playlistService.getCurrentPlaylistValue();
          const targetId = current ? current.id : playlists[0].id;
          this.playlistService.loadPlaylist(targetId).subscribe(loaded => {
            this.syncLocalSettingsFromPlaylist(loaded);
          });
        } else {
          this.seedInitialPlaylist();
        }
      },
      error: () => {
        this.seedInitialPlaylist();
      }
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.stopPreview();
  }

  private seedInitialPlaylist(): void {
    this.isImporting = true;
    this.playlistService.seedDefaultPlaylist().subscribe({
      next: (playlist) => {
        this.isImporting = false;
        this.syncLocalSettingsFromPlaylist(playlist);
      },
      error: (err) => {
        this.isImporting = false;
        this.errorMessage = err?.error?.message || 'Não foi possível importar a playlist inicial.';
      }
    });
  }

  private syncLocalSettingsFromPlaylist(playlist: PlaylistDetail | null): void {
    if (!playlist) return;
    const loggedUser = this.authService.getCurrentUserValue();
    this.profileNameInput = loggedUser
      ? (loggedUser.displayName || loggedUser.username)
      : (playlist.profileName || playlist.ownerName || '');
    this.descriptionInput = playlist.description || '';
    this.isSharedOnHomeInput = playlist.isSharedOnHome;
    this.votingEnabledInput = playlist.votingEnabled;
    this.sortMode = playlist.votingEnabled ? 'ranking' : 'original';
    if (!playlist.isCustomCreated) {
      this.newPlaylistName = `${playlist.name} - Selecionadas`;
    }
  }

  public onImportSpotifyPlaylist(): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.create.actionLabel,
      AuthStore.REASONS.create.explanation,
      () => {
      const user = this.authStore.getCurrentUser()!;
      const url = this.playlistUrlInput.trim();
      if (!url) {
        this.errorMessage = 'Cole o link da playlist do Spotify para importar.';
        return;
      }

      this.isImporting = true;
      this.errorMessage = '';
      this.feedbackMessage = '';

      this.playlistService.importPlaylist(
        url,
        user.displayName || user.username,
        this.isSharedOnHomeInput,
        this.votingEnabledInput,
        user.userId,
        user.profileId || null,
        user.organizationName || null
      ).subscribe({
        next: (playlist) => {
          this.isImporting = false;
          this.syncLocalSettingsFromPlaylist(playlist);
          this.feedbackMessage = `Playlist "${playlist.name}" sincronizada com ${playlist.tracksCount} músicas!`;
        },
        error: (err) => {
          this.isImporting = false;
          this.errorMessage = err?.error?.message || 'Falha ao importar playlist do Spotify.';
        }
      });
    });
  }

  public onSelectPlaylist(playlistId: any): void {
    const id = Number(playlistId);
    if (!id) return;
    this.stopPreview();
    this.playlistService.loadPlaylist(id).subscribe(loaded => {
      this.syncLocalSettingsFromPlaylist(loaded);
    });
  }

  public canManagePlaylist(
    playlist: PlaylistDetail | null | undefined,
    user: TransicionaisUserSession | null | undefined
  ): boolean {
    return canManagePlaylistVisibility(playlist, user);
  }

  public onSaveProfileAndShareSettings(playlistId: number): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.edit.actionLabel,
      AuthStore.REASONS.edit.explanation,
      () => {
      const user = this.authStore.getCurrentUser()!;
      const current = this.playlistService.getCurrentPlaylistValue();
      if (current && current.id === playlistId && !canManagePlaylistVisibility(current, user)) {
        this.errorMessage = 'Somente o proprietário da playlist ou administradores podem alterar estas configurações.';
        return;
      }
      this.isSavingSettings = true;
      this.errorMessage = '';
      this.feedbackMessage = '';

      const effectiveProfileName = user.displayName || user.username || this.profileNameInput.trim();

      this.playlistService.updatePlaylistSettings(playlistId, {
        profileName: effectiveProfileName,
        externalUserId: user.userId,
        externalProfileId: user.profileId || null,
        organizationName: user.organizationName || null,
        description: this.descriptionInput.trim(),
        isSharedOnHome: this.isSharedOnHomeInput,
        votingEnabled: this.votingEnabledInput
      }).subscribe({
        next: (updated) => {
          this.isSavingSettings = false;
          const shareStatus = updated.isSharedOnHome
            ? 'Pública para Todos no Mural Inicial'
            : 'Privada (visível apenas no seu perfil)';
          this.feedbackMessage = `Playlist salva no perfil "${updated.profileName}" como ${shareStatus}!`;
        },
        error: (err) => {
          this.isSavingSettings = false;
          this.errorMessage = err?.error?.message || 'Erro ao salvar configurações de perfil.';
        }
      });
    });
  }

  public onSyncTransicionaisMembers(): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.vote.actionLabel,
      AuthStore.REASONS.vote.explanation,
      () => {
      this.isSyncingMembers = true;
      this.errorMessage = '';
      this.feedbackMessage = '';

      this.authService.syncOrganizationMembers().subscribe({
        next: (res) => {
          this.isSyncingMembers = false;
          this.playlistService.setVotersList(res.voters);
          this.feedbackMessage = `${res.importedCount} perfis sincronizados para a lista reutilizável!`;
        },
        error: (err) => {
          this.isSyncingMembers = false;
          this.errorMessage = err?.error?.message || 'Não foi possível sincronizar membros.';
        }
      });
    });
  }

  public onToggleVotingMode(playlist: PlaylistDetail): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.vote.actionLabel,
      AuthStore.REASONS.vote.explanation,
      () => {
      const nextVotingState = !this.votingEnabledInput;
      this.votingEnabledInput = nextVotingState;
      this.sortMode = nextVotingState ? 'ranking' : 'original';

      this.playlistService.updatePlaylistSettings(playlist.id, {
        votingEnabled: nextVotingState
      }).subscribe({
        next: () => {
          this.feedbackMessage = nextVotingState
            ? 'Modo de votação ativado para esta playlist!'
            : 'Modo de votação desativado. Exibindo modo repertório e notas.';
        }
      });
    });
  }

  public onImportSingleTrackToCifraTrans(playlistId: number, track: PlaylistTrack, openImmediately = true): void {
    const currentPlaylist = this.playlistService.getCurrentPlaylistValue();
    const playlistName = currentPlaylist?.name || 'Playlist';

    // Se a página de notas já existe, abre direto no Modo Palco
    if (track.songId && openImmediately) {
      this.uiStore.setPlaylistContext({ id: playlistId, name: playlistName });
      this.openSongInViewer.emit({
        songId: track.songId,
        createdNew: false,
        playlistId,
        playlistName
      });
      this.router.navigate(['/palco', track.songId]);
      return;
    }

    this.authStore.requireAuth(
      AuthStore.REASONS.create.actionLabel,
      AuthStore.REASONS.create.explanation,
      () => {
      this.importingTrackId = track.id;
      this.errorMessage = '';

      this.playlistService.importTrackToSong(playlistId, track.id, this.importedSongsPublicInput).subscribe({
        next: (res) => {
          this.importingTrackId = null;
          this.songStore.loadSongs().subscribe();
          this.feedbackMessage = `Página de notas "${res.song.title}" criada no Cifra Trans!`;
          if (openImmediately) {
            this.uiStore.setPlaylistContext({ id: playlistId, name: playlistName });
            this.openSongInViewer.emit({
              songId: res.songId,
              createdNew: res.createdNew,
              playlistId,
              playlistName
            });
            this.router.navigate([res.createdNew ? '/estudio' : '/palco', res.songId]);
          }
        },
        error: (err) => {
          this.importingTrackId = null;
          this.errorMessage = err?.error?.message || 'Não foi possível criar a página de notas para esta música.';
        }
      });
    });
  }

  public onBatchImportToCifraTrans(playlistId: number, onlyVoted: boolean): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.create.actionLabel,
      AuthStore.REASONS.create.explanation,
      () => {
      this.isBatchImportingSongs = true;
      this.errorMessage = '';
      this.feedbackMessage = '';

      this.playlistService.importBatchTracksToSongs(playlistId, onlyVoted, this.importedSongsPublicInput).subscribe({
        next: (res) => {
          this.isBatchImportingSongs = false;
          this.songStore.loadSongs().subscribe();
          this.feedbackMessage = `${res.totalProcessed} músicas importadas para a base de páginas de notas do Cifra Trans (${res.createdCount} novas criadas)!`;
        },
        error: (err) => {
          this.isBatchImportingSongs = false;
          this.errorMessage = err?.error?.message || 'Erro ao importar músicas para o Cifra Trans.';
        }
      });
    });
  }

  public selectVoter(name: string): void {
    this.activeVoterName = name;
    this.errorMessage = '';
  }

  public useLoggedUserAsVoter(user: TransicionaisUserSession): void {
    this.activeVoterName = user.displayName || user.username;
    this.errorMessage = '';
  }

  public addOrSelectTypedVoter(): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.vote.actionLabel,
      AuthStore.REASONS.vote.explanation,
      () => {
      const trimmed = this.activeVoterName.trim();
      if (!trimmed) {
        this.errorMessage = 'Digite um nome para adicionar à lista de pessoas.';
        return;
      }

      this.errorMessage = '';
      this.playlistService.registerVoter(trimmed).subscribe({
        next: (voter) => {
          this.activeVoterName = voter.name;
          this.feedbackMessage = `Pessoa "${voter.name}" ativa e salva para reutilização!`;
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Erro ao salvar nome.';
        }
      });
    });
  }

  public hasActiveVoterVoted(track: PlaylistTrack): boolean {
    const current = this.activeVoterName.trim().toLowerCase();
    if (!current || !track.voters) return false;
    return track.voters.some(v => v.toLowerCase() === current);
  }

  public onVoteTrack(playlistId: number, track: PlaylistTrack): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.vote.actionLabel,
      AuthStore.REASONS.vote.explanation,
      () => {
      const user = this.authStore.getCurrentUser()!;
      const voterName = (this.activeVoterName.trim() || user.displayName || user.username);
      if (!voterName) {
        this.errorMessage = 'Digite ou selecione quem está votando antes de clicar em Votar!';
        return;
      }

      this.errorMessage = '';
      this.votingTrackId = track.id;

      this.playlistService.toggleVote(playlistId, track.id, voterName).subscribe({
        next: (res) => {
          this.votingTrackId = null;
          this.activeVoterName = res.voter.name;
        },
        error: (err) => {
          this.votingTrackId = null;
          this.errorMessage = err?.error?.message || 'Não foi possível registrar o voto.';
        }
      });
    });
  }

  public openGeneratePlaylistPanel(): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.create.actionLabel,
      AuthStore.REASONS.create.explanation,
      () => {
      this.showGeneratePanel = !this.showGeneratePanel;
    });
  }

  public getFilteredTracks(tracks: PlaylistTrack[]): PlaylistTrack[] {
    if (!tracks) return [];
    let list = [...tracks];

    if (this.filterOnlyVoted) {
      list = list.filter(t => t.votesCount > 0);
    }

    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.voters && t.voters.some(v => v.toLowerCase().includes(q)))
      );
    }

    if (this.sortMode === 'ranking') {
      list.sort((a, b) => {
        if (b.votesCount !== a.votesCount) return b.votesCount - a.votesCount;
        return a.trackOrder - b.trackOrder;
      });
    } else {
      list.sort((a, b) => a.trackOrder - b.trackOrder);
    }

    return list;
  }

  public countTracksWithMinVotes(tracks: PlaylistTrack[], minVotes: number): number {
    if (!tracks) return 0;
    const min = Math.max(0, Number(minVotes) || 0);
    return tracks.filter(t => t.votesCount >= min).length;
  }

  public onGenerateNewPlaylist(sourcePlaylistId: number): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.create.actionLabel,
      AuthStore.REASONS.create.explanation,
      () => {
      const user = this.authStore.getCurrentUser()!;
      this.isGenerating = true;
      this.errorMessage = '';
      this.feedbackMessage = '';

      this.playlistService.generatePlaylist(sourcePlaylistId, {
        name: this.newPlaylistName.trim() || 'Nova Playlist Selecionada',
        minVotes: Math.max(0, Number(this.minVotesFilter) || 0),
        topLimit: this.topLimitFilter && this.topLimitFilter > 0 ? Number(this.topLimitFilter) : null,
        profileName: user.displayName || user.username,
        externalUserId: user.userId,
        externalProfileId: user.profileId || null,
        organizationName: user.organizationName || null,
        description: this.descriptionInput.trim() || null,
        isSharedOnHome: this.isSharedOnHomeInput,
        votingEnabled: this.votingEnabledInput,
        importToSongs: this.generateImportToSongs
      }).subscribe({
        next: (res) => {
          this.isGenerating = false;
          if (this.generateImportToSongs) {
            this.songStore.loadSongs().subscribe();
          }
          this.feedbackMessage = `Nova playlist "${res.playlist.name}" criada com ${res.playlist.tracksCount} músicas!`;
          if (res.spotifyWarning) {
            this.errorMessage = res.spotifyWarning;
          }
        },
        error: (err) => {
          this.isGenerating = false;
          this.errorMessage = err?.error?.message || 'Não foi possível gerar a nova playlist.';
        }
      });
    });
  }

  public togglePreview(track: PlaylistTrack): void {
    if (!track.previewUrl) return;

    if (this.playingTrackId === track.id) {
      this.stopPreview();
      return;
    }

    this.stopPreview();
    this.audioPlayer = new Audio(track.previewUrl);
    this.playingTrackId = track.id;
    this.audioPlayer.play().catch(() => {
      this.playingTrackId = null;
    });
    this.audioPlayer.onended = () => {
      this.playingTrackId = null;
    };
  }

  public stopPreview(): void {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
    this.playingTrackId = null;
  }

  public formatDuration(ms: number): string {
    if (!ms || ms <= 0) return '';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }
}
