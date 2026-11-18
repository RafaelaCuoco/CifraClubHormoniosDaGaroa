import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Drum,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Guitar,
  Headphones,
  Home,
  Info,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Moon,
  Music,
  Music2,
  Pause,
  Pencil,
  Piano,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Save,
  Search,
  Shield,
  SkipBack,
  SkipForward,
  Sliders,
  Sparkles,
  Square,
  Sun,
  ThumbsUp,
  Timer,
  Trophy,
  Unlock,
  User,
  UserPlus,
  Vote,
  Wind,
  X,
  Zap,
  type IconNode
} from 'lucide';

const ICON_REGISTRY = {
  'alert-triangle': AlertTriangle,
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  bell: Bell,
  check: Check,
  'check-circle': CheckCircle2,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  clock: Clock,
  download: Download,
  drum: Drum,
  eye: Eye,
  'eye-off': EyeOff,
  'file-text': FileText,
  globe: Globe,
  guitar: Guitar,
  headphones: Headphones,
  home: Home,
  info: Info,
  loader: Loader2,
  lock: Lock,
  'log-in': LogIn,
  'log-out': LogOut,
  moon: Moon,
  music: Music,
  'music-2': Music2,
  pause: Pause,
  pencil: Pencil,
  piano: Piano,
  play: Play,
  plus: Plus,
  'refresh-cw': RefreshCw,
  repeat: Repeat,
  save: Save,
  search: Search,
  shield: Shield,
  'skip-back': SkipBack,
  'skip-forward': SkipForward,
  sliders: Sliders,
  sparkles: Sparkles,
  square: Square,
  sun: Sun,
  'thumbs-up': ThumbsUp,
  timer: Timer,
  trophy: Trophy,
  unlock: Unlock,
  user: User,
  'user-plus': UserPlus,
  vote: Vote,
  wind: Wind,
  x: X,
  zap: Zap
} as const satisfies Record<string, IconNode>;

export type CtIconName = keyof typeof ICON_REGISTRY;

@Component({
  selector: 'ct-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      [attr.width]="size"
      [attr.height]="size"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      [class]="spin ? 'inline-block shrink-0 animate-spin' : 'inline-block shrink-0'"
      [attr.aria-hidden]="ariaLabel ? null : 'true'"
      [attr.aria-label]="ariaLabel || null"
      [attr.role]="ariaLabel ? 'img' : null">
      @for (node of nodes; track $index) {
        @switch (node[0]) {
          @case ('path') {
            <path [attr.d]="node[1]['d']" />
          }
          @case ('circle') {
            <circle [attr.cx]="node[1]['cx']" [attr.cy]="node[1]['cy']" [attr.r]="node[1]['r']" />
          }
          @case ('rect') {
            <rect
              [attr.x]="node[1]['x']"
              [attr.y]="node[1]['y']"
              [attr.width]="node[1]['width']"
              [attr.height]="node[1]['height']"
              [attr.rx]="node[1]['rx']"
              [attr.ry]="node[1]['ry']" />
          }
          @case ('line') {
            <line
              [attr.x1]="node[1]['x1']"
              [attr.y1]="node[1]['y1']"
              [attr.x2]="node[1]['x2']"
              [attr.y2]="node[1]['y2']" />
          }
          @case ('ellipse') {
            <ellipse
              [attr.cx]="node[1]['cx']"
              [attr.cy]="node[1]['cy']"
              [attr.rx]="node[1]['rx']"
              [attr.ry]="node[1]['ry']" />
          }
        }
      }
    </svg>
  `
})
export class IconComponent {
  @Input({ required: true }) name!: CtIconName;
  @Input() size = 16;
  @Input() strokeWidth = 2;
  @Input() spin = false;
  @Input() ariaLabel?: string;

  public get nodes(): IconNode {
    return ICON_REGISTRY[this.name] ?? ICON_REGISTRY['music'];
  }
}
