import { Routes } from '@angular/router';
import { LegacyRedirectComponent } from './pages/legacy-redirect.component';
import { MuralPageComponent } from './pages/mural-page.component';
import { StagePageComponent } from './pages/stage-page.component';
import { StudioPageComponent } from './pages/studio-page.component';
import { VotingRoomComponent } from './components/voting-room/voting-room.component';
import { DesignSystemShowcaseComponent } from './design-system/design-system-showcase.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LegacyRedirectComponent
  },
  {
    path: 'mural',
    component: MuralPageComponent
  },
  {
    path: 'palco',
    component: StagePageComponent
  },
  {
    path: 'palco/:id',
    component: StagePageComponent
  },
  {
    path: 'estudio',
    component: StudioPageComponent
  },
  {
    path: 'estudio/:id',
    component: StudioPageComponent
  },
  {
    path: 'playlists',
    component: VotingRoomComponent
  },
  {
    path: 'design-system',
    component: DesignSystemShowcaseComponent
  },
  {
    path: '**',
    redirectTo: 'mural'
  }
];
