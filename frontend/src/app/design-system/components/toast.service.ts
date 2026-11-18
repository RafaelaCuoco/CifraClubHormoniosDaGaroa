import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type CtToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface CtToastMessage {
  id: number;
  variant: CtToastVariant;
  message: string;
  title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 1;
  private readonly toastsSubject = new BehaviorSubject<CtToastMessage[]>([]);
  public readonly toasts$ = this.toastsSubject.asObservable();

  public show(
    message: string,
    variant: CtToastVariant = 'info',
    title?: string,
    durationMs = 4500
  ): number {
    const id = this.nextId++;
    const next = [...this.toastsSubject.getValue(), { id, variant, message, title }];
    this.toastsSubject.next(next);
    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
    return id;
  }

  public dismiss(id: number): void {
    this.toastsSubject.next(this.toastsSubject.getValue().filter(t => t.id !== id));
  }
}
