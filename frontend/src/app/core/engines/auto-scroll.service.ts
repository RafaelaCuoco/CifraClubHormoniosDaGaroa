import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { PlayerStore } from '../stores/player.store';

/**
 * Módulo puro de temporização da rolagem automática.
 * Emite deltas em pixels via scrollDelta$ sem manipular o DOM diretamente.
 */
@Injectable({
  providedIn: 'root'
})
export class AutoScroll implements OnDestroy {
  private readonly playerStore = inject(PlayerStore);

  private readonly scrollDeltaSubject = new Subject<number>();
  public readonly scrollDelta$ = this.scrollDeltaSubject.asObservable();

  private timer: ReturnType<typeof setInterval> | null = null;
  private currentSpeedPxPerSec = 40;
  private subs = new Subscription();

  constructor() {
    this.subs.add(
      this.playerStore.autoScrollSpeedPxPerSec$.subscribe(speed => {
        this.currentSpeedPxPerSec = speed;
      })
    );

    this.subs.add(
      this.playerStore.isAutoScrolling$.subscribe(active => {
        if (active) {
          this.startTimer();
        } else {
          this.stopTimer();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.subs.unsubscribe();
  }

  public notifyReachedEnd(): void {
    this.playerStore.stopAutoScroll();
  }

  private startTimer(): void {
    if (this.timer) return;
    const intervalMs = 50;
    this.timer = setInterval(() => {
      const deltaPx = (this.currentSpeedPxPerSec * intervalMs) / 1000;
      this.scrollDeltaSubject.next(deltaPx);
    }, intervalMs);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
