import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SongService } from './core/services/song.service';
import { Song, InstrumentTrack } from './core/models/song.model';
import { ToolboxComponent } from './components/toolbox/toolbox.component';
import { LyricsViewerComponent } from './components/lyrics-viewer/lyrics-viewer.component';
import { ChordDictionaryComponent } from './components/chord-dictionary/chord-dictionary.component';
import { StudioComponent } from './components/studio/studio.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToolboxComponent,
    LyricsViewerComponent,
    ChordDictionaryComponent,
    StudioComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  public songService = inject(SongService);
  public activeTab: 'viewer' | 'studio' = 'viewer';
  public selectedSongId: number | null = null;

  public songToEdit: Song | null = null;
  public trackToEdit: InstrumentTrack | null = null;

  ngOnInit(): void {
    // Carrega a lista de músicas do backend
    this.songService.loadSongs().subscribe({
      next: (songs) => {
        if (songs && songs.length > 0) {
          this.selectedSongId = songs[0].id;
          this.songService.loadSong(songs[0].id).subscribe();
        } else {
          // Se o banco estiver vazio, aciona o seed automático da demo
          this.songService.seedDemoSong().subscribe(seedSong => {
            if (seedSong) {
              this.selectedSongId = seedSong.id;
            }
          });
        }
      },
      error: () => {
        // Fallback em caso de API iniciando
        this.songService.seedDemoSong().subscribe();
      }
    });

    this.songService.currentSong$.subscribe(song => {
      if (song) {
        this.selectedSongId = song.id;
      }
    });
  }

  public onSongChange(event: any): void {
    const id = Number(event);
    if (id) {
      this.selectedSongId = id;
      this.songService.loadSong(id).subscribe();
    }
  }

  public openCreateStudio(): void {
    this.songToEdit = null;
    this.trackToEdit = null;
    this.activeTab = 'studio';
  }

  public openEditStudio(): void {
    this.songToEdit = this.songService.getCurrentSongValue();
    this.trackToEdit = this.songService.getActiveTrackValue();
    this.activeTab = 'studio';
  }

  public openViewer(): void {
    this.songToEdit = null;
    this.trackToEdit = null;
    this.activeTab = 'viewer';
  }

  public onStudioSaved(): void {
    const targetId = this.songToEdit?.id;
    this.openViewer();
    if (targetId) {
      this.songService.loadSong(targetId).subscribe();
    }
  }
}
