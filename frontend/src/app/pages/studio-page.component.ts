import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Song, InstrumentTrack } from '../core/models/song.model';
import { SongStore } from '../core/stores/song.store';
import { UiStore } from '../core/stores/ui.store';
import { StudioComponent } from '../components/studio/studio.component';

@Component({
  selector: 'app-studio-page',
  standalone: true,
  imports: [CommonModule, StudioComponent],
  template: `
    <div class="max-w-4xl mx-auto">
      <app-studio
        [editSong]="songToEdit"
        [editTrack]="trackToEdit"
        [returnToPlaylistLabel]="(uiStore.playlistContext$ | async)?.name || null"
        (saved)="onSaved()"
        (cancel)="onCancel()"
        (backToPlaylist)="onBackToPlaylist()">
      </app-studio>
    </div>
  `
})
export class StudioPageComponent implements OnInit, OnDestroy {
  private readonly songStore = inject(SongStore);
  public readonly uiStore = inject(UiStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public songToEdit: Song | null = null;
  public trackToEdit: InstrumentTrack | null = null;
  private subs = new Subscription();

  ngOnInit(): void {
    this.subs.add(
      this.route.paramMap.subscribe(params => {
        const idParam = Number(params.get('id'));
        if (idParam && idParam > 0) {
          this.songStore.loadSong(idParam).subscribe(song => {
            this.songToEdit = song;
            this.trackToEdit = this.songStore.getActiveTrack() || song.tracks?.[0] || null;
          });
        } else {
          this.songToEdit = null;
          this.trackToEdit = null;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  public onSaved(): void {
    const targetId = this.songToEdit?.id || this.songStore.getCurrentSong()?.id;
    if (targetId) {
      this.router.navigate(['/palco', targetId]);
    } else {
      this.router.navigate(['/mural']);
    }
  }

  public onCancel(): void {
    const targetId = this.songToEdit?.id || this.songStore.getCurrentSong()?.id;
    if (targetId) {
      this.router.navigate(['/palco', targetId]);
    } else {
      this.router.navigate(['/mural']);
    }
  }

  public onBackToPlaylist(): void {
    this.router.navigate(['/playlists']);
  }
}
