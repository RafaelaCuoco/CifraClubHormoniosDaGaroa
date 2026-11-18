import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SongStore } from './core/stores/song.store';
import { AuthStore } from './core/stores/auth.store';
import { UiStore } from './core/stores/ui.store';
import { PlaylistService } from './core/services/playlist.service';
import { AuthGateComponent } from './components/auth/auth-gate.component';
import { AuthModalComponent } from './components/auth/auth-modal.component';
import {
  BadgeComponent,
  ButtonComponent,
  IconButtonComponent,
  IconComponent,
  PT_BR_GLOSSARY,
  ToastContainerComponent
} from './design-system';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AuthGateComponent,
    AuthModalComponent,
    IconComponent,
    ButtonComponent,
    IconButtonComponent,
    BadgeComponent,
    ToastContainerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  public readonly songStore = inject(SongStore);
  public readonly authStore = inject(AuthStore);
  public readonly uiStore = inject(UiStore);
  private readonly playlistService = inject(PlaylistService);
  public readonly router = inject(Router);
  public readonly glossary = PT_BR_GLOSSARY;

  ngOnInit(): void {
    this.authStore.currentUser$.subscribe(() => {
      this.songStore.loadSongs().subscribe({
        next: songs => {
          if ((!songs || songs.length === 0) && !this.songStore.getCurrentSong()) {
            this.songStore.seedDemoSong().subscribe();
          }
        },
        error: () => {
          this.songStore.seedDemoSong().subscribe();
        }
      });

      this.playlistService.loadSharedPlaylists().subscribe({
        next: shared => {
          if (!shared || shared.length === 0) {
            this.playlistService.seedDefaultPlaylist().subscribe();
          }
        }
      });
    });
  }

  public get stageRoute(): any[] {
    const currentId = this.songStore.getCurrentSong()?.id;
    return currentId ? ['/palco', currentId] : ['/palco'];
  }

  public onCreateStudioClick(): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.create.actionLabel,
      AuthStore.REASONS.create.explanation,
      () => this.router.navigate(['/estudio'])
    );
  }
}
