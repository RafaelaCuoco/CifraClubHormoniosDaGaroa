import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlaylistService } from '../core/services/playlist.service';
import { UiStore } from '../core/stores/ui.store';

/**
 * Redireciona URLs legadas (?tab=viewer&songId=N, ?tab=studio, ?tab=voting)
 * para as rotas canônicas (/palco/:id, /estudio/:id, /playlists, /mural)
 * preservando links compartilhados.
 */
@Component({
  selector: 'app-legacy-redirect',
  standalone: true,
  template: ''
})
export class LegacyRedirectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly playlistService = inject(PlaylistService);
  private readonly uiStore = inject(UiStore);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const tab = params.get('tab');
    const songId = Number(params.get('songId'));
    const playlistId = Number(params.get('playlistId'));

    if (playlistId && playlistId > 0) {
      this.playlistService.loadPlaylist(playlistId).subscribe(pl => {
        if (pl) {
          this.uiStore.setPlaylistContext({ id: pl.id, name: pl.name });
        }
      });
    }

    if (tab === 'viewer') {
      if (songId && songId > 0) {
        this.router.navigate(['/palco', songId], { replaceUrl: true });
      } else {
        this.router.navigate(['/palco'], { replaceUrl: true });
      }
      return;
    }

    if (tab === 'studio') {
      if (songId && songId > 0) {
        this.router.navigate(['/estudio', songId], { replaceUrl: true });
      } else {
        this.router.navigate(['/estudio'], { replaceUrl: true });
      }
      return;
    }

    if (tab === 'voting') {
      this.router.navigate(['/playlists'], { replaceUrl: true });
      return;
    }

    if (tab === 'design-system') {
      this.router.navigate(['/design-system'], { replaceUrl: true });
      return;
    }

    this.router.navigate(['/mural'], { replaceUrl: true });
  }
}
