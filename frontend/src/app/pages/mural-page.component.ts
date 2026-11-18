import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SongStore } from '../core/stores/song.store';
import { AuthStore } from '../core/stores/auth.store';
import { PlayerStore } from '../core/stores/player.store';
import { UiStore } from '../core/stores/ui.store';
import { PlaylistService } from '../core/services/playlist.service';
import { SongSummary } from '../core/models/song.model';
import { PlaylistPreviewTrack, PlaylistSummary } from '../core/models/playlist.model';
import {
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  EmptyStateComponent,
  IconComponent,
  PT_BR_GLOSSARY,
  SkeletonComponent
} from '../design-system';
import { VisibilityBadgeComponent } from '../components/visibility-badge/visibility-badge.component';

@Component({
  selector: 'app-mural-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    ButtonComponent,
    BadgeComponent,
    CardComponent,
    EmptyStateComponent,
    SkeletonComponent,
    VisibilityBadgeComponent
  ],
  template: `
    <div class="space-y-8">
      <!-- Seção 1: Mural de Perfis & Playlists Compartilhadas -->
      @if ((playlistService.sharedPlaylists$ | async); as sharedPlaylists) {
        <ct-card padding="lg">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b" style="border-color: var(--ct-border-default);">
            <div class="flex items-center gap-2.5">
              <span
                class="inline-flex items-center justify-center w-9 h-9 rounded-[var(--ct-radius-md)]"
                style="background: var(--ct-success-bg); color: var(--ct-success-fg);">
                <ct-icon name="globe" [size]="18"></ct-icon>
              </span>
              <div>
                <h2 class="text-base sm:text-lg font-black flex items-center gap-2" style="color: var(--ct-text-primary);">
                  <span>Mural de Perfis & Playlists Compartilhadas</span>
                  <ct-badge variant="neutral" size="sm">{{ getFilteredSharedPlaylists(sharedPlaylists).length }}</ct-badge>
                </h2>
                <p class="text-xs" style="color: var(--ct-text-muted);">
                  Escolha uma playlist pública dos perfis ou abra uma música diretamente no {{ glossary.areas.palco }}.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <div class="relative inline-flex items-center">
                <select
                  id="home-profile-filter"
                  name="homeProfileFilter"
                  aria-label="Filtrar playlists por perfil"
                  [(ngModel)]="selectedHomeProfileFilter"
                  class="ct-native-select border rounded-[var(--ct-radius-md)] px-3 py-2 pr-8 text-xs font-bold cursor-pointer"
                  style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);">
                  <option value="">Públicas de Todos os Perfis</option>
                  @if (authStore.currentUser$ | async) {
                    <option value="__MINE__">Minhas Playlists (Públicas + Privadas)</option>
                  }
                  @for (prof of getUniqueSharedProfiles(sharedPlaylists); track prof) {
                    <option [value]="prof">Perfil: {{ prof }}</option>
                  }
                </select>
                <span class="pointer-events-none absolute right-2.5 inline-flex" style="color: var(--ct-text-muted);">
                  <ct-icon name="chevron-down" [size]="14"></ct-icon>
                </span>
              </div>

              <ct-button variant="primary" size="sm" leftIcon="headphones" (pressed)="openPlaylists()">
                {{ (authStore.currentUser$ | async) ? 'Gerenciar Playlists' : 'Abrir Sala de Playlists' }}
              </ct-button>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (pl of getFilteredSharedPlaylists(sharedPlaylists); track pl.id) {
              <div
                class="border rounded-[var(--ct-radius-xl)] p-4 flex flex-col justify-between gap-3 transition-all"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default); box-shadow: var(--ct-shadow-sm);">
                <div>
                  <div class="flex items-start gap-3">
                    @if (pl.coverImageUrl) {
                      <img
                        [src]="pl.coverImageUrl"
                        [alt]="pl.name"
                        class="w-12 h-12 rounded-[var(--ct-radius-md)] object-cover border shrink-0"
                        style="border-color: var(--ct-border-strong);" />
                    } @else {
                      <div
                        class="w-12 h-12 rounded-[var(--ct-radius-md)] flex items-center justify-center shrink-0"
                        style="background: var(--ct-bg-surface); color: var(--ct-success-fg);">
                        <ct-icon name="music" [size]="20"></ct-icon>
                      </div>
                    }
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <ct-badge variant="primary" size="sm" icon="user">
                          {{ pl.profileName || pl.ownerName }}
                        </ct-badge>
                        <ct-visibility-badge [isPublic]="pl.isSharedOnHome" size="sm"></ct-visibility-badge>
                      </div>
                      <h3 class="text-sm font-black truncate mt-1" style="color: var(--ct-text-primary);" [title]="pl.name">
                        {{ pl.name }}
                      </h3>
                      <p class="text-[11px]" style="color: var(--ct-text-muted);">
                        {{ pl.tracksCount }} músicas • {{ pl.importedSongsCount || 0 }} {{ (pl.importedSongsCount || 0) === 1 ? 'página de notas criada' : 'páginas de notas criadas' }}
                      </p>
                    </div>
                  </div>

                  @if (pl.description) {
                    <p class="text-xs italic mt-2 line-clamp-2" style="color: var(--ct-text-secondary);">"{{ pl.description }}"</p>
                  }

                  @if (pl.previewTracks && pl.previewTracks.length > 0) {
                    <div class="mt-3 pt-2.5 border-t space-y-1.5" style="border-color: var(--ct-border-default);">
                      <span class="block text-[10px] font-bold uppercase tracking-wider" style="color: var(--ct-text-muted);">
                        Músicas em destaque:
                      </span>
                      @for (t of pl.previewTracks; track t.id) {
                        <button
                          type="button"
                          (click)="openOrImportPreviewTrackOnHome(pl, t)"
                          class="w-full text-left px-2.5 py-1.5 rounded-[var(--ct-radius-sm)] border flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer"
                          style="background: var(--ct-bg-surface); border-color: var(--ct-border-default);">
                          <span class="truncate font-semibold inline-flex items-center gap-1.5" style="color: var(--ct-text-primary);">
                            <ct-icon name="music" [size]="12" style="color: var(--ct-text-muted);"></ct-icon>
                            <span class="truncate">{{ t.title }} <span class="font-normal" style="color: var(--ct-text-muted);">- {{ t.artist }}</span></span>
                          </span>
                          <span
                            class="text-[10px] font-bold shrink-0 inline-flex items-center gap-1"
                            [style.color]="t.songId ? 'var(--ct-info-fg)' : 'var(--ct-accent-highlight)'">
                            <ct-icon [name]="t.songId ? 'guitar' : ((authStore.currentUser$ | async) ? 'pencil' : 'lock')" [size]="11"></ct-icon>
                            <span>{{ t.songId ? glossary.areas.palco : ((authStore.currentUser$ | async) ? 'Criar nota' : glossary.auth.loginToCreate) }}</span>
                          </span>
                        </button>
                      }
                    </div>
                  }
                </div>

                <div class="pt-2 border-t flex items-center justify-between gap-2" style="border-color: var(--ct-border-default);">
                  <ct-button variant="secondary" size="sm" [fullWidth]="true" (pressed)="openSharedPlaylist(pl.id)">
                    Abrir Playlist ({{ pl.tracksCount }})
                  </ct-button>

                  <ct-button
                    variant="primary"
                    size="sm"
                    [leftIcon]="(authStore.currentUser$ | async) ? 'vote' : 'lock'"
                    (pressed)="openSharedPlaylist(pl.id, true)">
                    {{ (authStore.currentUser$ | async) ? 'Votar' : glossary.auth.loginToVote }}
                  </ct-button>
                </div>
              </div>
            }
          </div>
        </ct-card>
      }

      <!-- Seção 2: Catálogo de Cifras -->
      <ct-card padding="lg">
        @if (songStore.loadingList$ | async) {
          <ct-skeleton variant="card" height="140px"></ct-skeleton>
        } @else if ((songStore.error$ | async); as catalogErr) {
          <ct-empty-state
            icon="alert-triangle"
            title="Erro ao carregar catálogo"
            [description]="catalogErr"
            actionLabel="Tentar novamente"
            actionIcon="refresh-cw"
            (action)="songStore.loadSongs().subscribe()">
          </ct-empty-state>
        } @else if ((songStore.songsList$ | async); as songsList) {
          <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style="border-color: var(--ct-border-default);">
              <div class="flex items-center gap-2.5">
                <span
                  class="inline-flex items-center justify-center w-9 h-9 rounded-[var(--ct-radius-md)]"
                  style="background: var(--ct-accent-soft-bg); color: var(--ct-accent-highlight);">
                  <ct-icon name="guitar" [size]="18"></ct-icon>
                </span>
                <div>
                  <h2 class="text-base sm:text-lg font-black" style="color: var(--ct-text-primary);">
                    Catálogo de Páginas de Notas & Tablaturas ({{ songsList.length }})
                  </h2>
                  <p class="text-xs" style="color: var(--ct-text-muted);">
                    Clique em {{ glossary.player.play }} para abrir no {{ glossary.areas.palco }} e iniciar a reprodução.
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <input
                  id="home-song-search"
                  name="homeSongSearch"
                  type="text"
                  aria-label="Filtrar música ou artista"
                  [(ngModel)]="homeSongSearch"
                  placeholder="Filtrar música ou artista..."
                  class="border rounded-[var(--ct-radius-md)] px-3.5 py-2 text-xs sm:text-sm"
                  style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
                <ct-button
                  variant="primary"
                  size="sm"
                  [leftIcon]="(authStore.currentUser$ | async) ? 'plus' : 'lock'"
                  (pressed)="onCreateSongClick()">
                  {{ (authStore.currentUser$ | async) ? 'Nova cifra' : glossary.auth.loginToCreate }}
                </ct-button>
              </div>
            </div>

            @let filteredSongs = getFilteredHomeSongs(songsList);
            @if (filteredSongs.length > 0) {
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                @for (song of filteredSongs; track song.id) {
                  <div
                    class="p-3.5 rounded-[var(--ct-radius-xl)] border transition-all flex items-center justify-between gap-3"
                    style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default);">
                    <button
                      type="button"
                      (click)="openSongInStage(song.id, false)"
                      class="min-w-0 flex-1 text-left bg-transparent border-0 p-0 cursor-pointer">
                      <div class="flex items-center gap-1.5">
                        <span class="font-black text-sm truncate" style="color: var(--ct-text-primary);">
                          {{ song.title }}
                        </span>
                        <ct-visibility-badge [isPublic]="song.isPublic" size="sm"></ct-visibility-badge>
                      </div>
                      <div class="text-xs truncate mt-0.5" style="color: var(--ct-text-muted);">
                        {{ song.artist }}
                      </div>
                    </button>

                    <div class="flex items-center gap-2 shrink-0">
                      <ct-badge variant="primary" size="sm">{{ glossary.player.key }} {{ song.originalKey }}</ct-badge>
                      <ct-button
                        variant="secondary"
                        size="sm"
                        leftIcon="play"
                        (pressed)="openSongInStage(song.id, true)">
                        {{ glossary.player.play }}
                      </ct-button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <ct-empty-state
                icon="search"
                title="Nenhuma cifra encontrada"
                description="Ajuste o filtro de busca ou crie uma nova cifra no Estúdio."
                actionLabel="Limpar filtro"
                actionIcon="x"
                (action)="homeSongSearch = ''">
              </ct-empty-state>
            }
          </div>
        }
      </ct-card>
    </div>
  `
})
export class MuralPageComponent {
  public readonly songStore = inject(SongStore);
  public readonly authStore = inject(AuthStore);
  public readonly playlistService = inject(PlaylistService);
  private readonly playerStore = inject(PlayerStore);
  private readonly uiStore = inject(UiStore);
  private readonly router = inject(Router);
  public readonly glossary = PT_BR_GLOSSARY;

  public selectedHomeProfileFilter = '';
  public homeSongSearch = '';

  public getFilteredHomeSongs(songs: SongSummary[] | null): SongSummary[] {
    if (!songs) return [];
    const q = this.homeSongSearch.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  }

  public getUniqueSharedProfiles(playlists: PlaylistSummary[]): string[] {
    if (!playlists) return [];
    const set = new Set<string>();
    for (const pl of playlists) {
      const p = (pl.profileName || pl.ownerName || '').trim();
      if (p) set.add(p);
    }
    return Array.from(set);
  }

  public getFilteredSharedPlaylists(playlists: PlaylistSummary[]): PlaylistSummary[] {
    if (!playlists) return [];
    if (!this.selectedHomeProfileFilter) {
      return playlists.filter(pl => pl.isSharedOnHome);
    }
    if (this.selectedHomeProfileFilter === '__MINE__') {
      const user = this.authStore.getCurrentUser();
      if (!user) return playlists.filter(pl => pl.isSharedOnHome);
      return playlists.filter(
        pl =>
          (pl.externalUserId && pl.externalUserId === user.userId) ||
          (pl.profileName || '').toLowerCase() === (user.displayName || user.username).toLowerCase()
      );
    }
    return playlists.filter(
      pl =>
        pl.isSharedOnHome &&
        (pl.profileName || pl.ownerName || '').toLowerCase() === this.selectedHomeProfileFilter.toLowerCase()
    );
  }

  public openPlaylists(): void {
    this.router.navigate(['/playlists']);
  }

  public onCreateSongClick(): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.create.actionLabel,
      AuthStore.REASONS.create.explanation,
      () => this.router.navigate(['/estudio'])
    );
  }

  public openSongInStage(songId: number, autoPlay: boolean): void {
    this.uiStore.clearPlaylistContext();
    if (autoPlay) {
      this.playerStore.requestPlayOnLoad();
    }
    this.router.navigate(['/palco', songId]);
  }

  public openSharedPlaylist(playlistId: number, enableVoting = false): void {
    if (enableVoting) {
      this.authStore.requireAuth(
        AuthStore.REASONS.vote.actionLabel,
        AuthStore.REASONS.vote.explanation,
        () => {
          this.playlistService.loadPlaylist(playlistId).subscribe(loaded => {
            this.uiStore.setPlaylistContext({ id: playlistId, name: loaded.name });
            if (!loaded.votingEnabled) {
              this.playlistService.updatePlaylistSettings(playlistId, { votingEnabled: true }).subscribe();
            }
          });
          this.router.navigate(['/playlists']);
        }
      );
      return;
    }

    this.playlistService.loadPlaylist(playlistId).subscribe(loaded => {
      this.uiStore.setPlaylistContext({ id: playlistId, name: loaded.name });
    });
    this.router.navigate(['/playlists']);
  }

  public openOrImportPreviewTrackOnHome(pl: PlaylistSummary, track: PlaylistPreviewTrack): void {
    this.uiStore.setPlaylistContext({ id: pl.id, name: pl.name });
    if (track.songId) {
      this.router.navigate(['/palco', track.songId]);
      return;
    }

    this.authStore.requireAuth(
      AuthStore.REASONS.create.actionLabel,
      AuthStore.REASONS.create.explanation,
      () => {
        this.playlistService.importTrackToSong(pl.id, track.id, true).subscribe(res => {
          this.songStore.loadSongs().subscribe();
          this.router.navigate([res.createdNew ? '/estudio' : '/palco', res.songId]);
        });
      }
    );
  }
}
