import { CtIconName } from '../../design-system';

export interface InstrumentConfig {
  id: string;
  label: string;
  studioLabel: string;
  icon: CtIconName;
  category: 'cordas-teclas' | 'percussao';
  lineNames: string[];
  baseFreqs: number[];
}

export const SUPPORTED_INSTRUMENTS: InstrumentConfig[] = [
  {
    id: 'Violão',
    label: 'Violão (6 Cordas)',
    studioLabel: 'Violão',
    icon: 'guitar',
    category: 'cordas-teclas',
    lineNames: ['e', 'B', 'G', 'D', 'A', 'E'],
    baseFreqs: [329.63, 246.94, 196.0, 146.83, 110.0, 82.41]
  },
  {
    id: 'Cavaquinho',
    label: 'Cavaquinho (D-G-B-D)',
    studioLabel: 'Cavaquinho',
    icon: 'music',
    category: 'cordas-teclas',
    lineNames: ['d', 'B', 'G', 'D'],
    baseFreqs: [293.66, 246.94, 196.0, 146.83]
  },
  {
    id: 'Baixo',
    label: 'Contrabaixo (4 Cordas)',
    studioLabel: 'Baixo',
    icon: 'guitar',
    category: 'cordas-teclas',
    lineNames: ['G', 'D', 'A', 'E'],
    baseFreqs: [98.0, 73.42, 55.0, 41.2]
  },
  {
    id: 'Guitarra',
    label: 'Guitarra (6 Cordas)',
    studioLabel: 'Guitarra',
    icon: 'zap',
    category: 'cordas-teclas',
    lineNames: ['e', 'B', 'G', 'D', 'A', 'E'],
    baseFreqs: [329.63, 246.94, 196.0, 146.83, 110.0, 82.41]
  },
  {
    id: 'Teclado',
    label: 'Teclado (Rhodes / Piano)',
    studioLabel: 'Teclado',
    icon: 'piano',
    category: 'cordas-teclas',
    lineNames: ['Voz 1', 'Voz 2', 'Voz 3', 'Voz 4', 'Baixo 1', 'Baixo 2'],
    baseFreqs: [523.25, 392.0, 329.63, 261.63, 130.81, 65.41]
  },
  {
    id: 'Escaleta',
    label: 'Escaleta (Melódica)',
    studioLabel: 'Escaleta',
    icon: 'wind',
    category: 'cordas-teclas',
    lineNames: ['Aguda', 'Média+', 'Média', 'Grave', 'Base 1', 'Base 2'],
    baseFreqs: [523.25, 392.0, 329.63, 261.63, 196.0, 130.81]
  },
  {
    id: 'Bateria',
    label: 'Bateria Completa',
    studioLabel: 'Bateria',
    icon: 'drum',
    category: 'percussao',
    lineNames: ['Chimbal', 'Prato', 'Caixa', 'Tom', 'Surdo', 'Bumbo'],
    baseFreqs: [800, 500, 220, 160, 110, 60]
  },
  {
    id: 'Caixa',
    label: 'Caixa de Guerra (Samba)',
    studioLabel: 'Caixa (Escola de Samba)',
    icon: 'drum',
    category: 'percussao',
    lineNames: ['Rimshot', 'Acento', 'Esteira', 'Rulo', 'Fantasma', 'Fundo'],
    baseFreqs: [380, 260, 220, 240, 200, 160]
  },
  {
    id: 'Repinique',
    label: 'Repinique (Escola de Samba)',
    studioLabel: 'Repinique',
    icon: 'drum',
    category: 'percussao',
    lineNames: ['Aro (Rim)', 'Baqueta', 'Mão Tapa', 'Mão Grave', 'Rulo', 'Chamada'],
    baseFreqs: [520, 360, 410, 250, 350, 390]
  },
  {
    id: 'Tamborim',
    label: 'Tamborim (Carreteiro)',
    studioLabel: 'Tamborim',
    icon: 'drum',
    category: 'percussao',
    lineNames: ['Aro Forte', 'Baqueta', 'Vira (Dedo)', 'Carret. 1', 'Carret. 2', 'Abafado'],
    baseFreqs: [680, 590, 540, 610, 570, 480]
  },
  {
    id: 'Agogô',
    label: 'Agogô (4 Bocas)',
    studioLabel: 'Agogô',
    icon: 'bell',
    category: 'percussao',
    lineNames: ['Boca 1 (Ag)', 'Boca 2 (M+)', 'Boca 3 (M)', 'Boca 4 (Gr)', 'Baqueta', 'Abafado'],
    baseFreqs: [880.0, 739.99, 587.33, 440.0, 1200, 660]
  },
  {
    id: 'Timbal',
    label: 'Timbal (Tapa / Aberto / Grave)',
    studioLabel: 'Timbal',
    icon: 'drum',
    category: 'percussao',
    lineNames: ['Slap (Tapa)', 'Open (Ag.)', 'Muffled', 'Bass (Gr.)', 'Aro', 'Virada'],
    baseFreqs: [460, 280, 210, 115, 620, 310]
  },
  {
    id: 'Alfaia',
    label: 'Alfaia (Baque / Maracatu)',
    studioLabel: 'Alfaia',
    icon: 'drum',
    category: 'percussao',
    lineNames: ['Taque (Ag)', 'Baque Forte', 'Grave Centro', 'Abafado', 'Rulo', 'Marcação'],
    baseFreqs: [240, 110, 72, 95, 180, 65]
  },
  {
    id: 'Surdo de Primeira',
    label: 'Surdo de Primeira (Marcação)',
    studioLabel: 'Surdo de Primeira (Marcação)',
    icon: 'drum',
    category: 'percussao',
    lineNames: ['Mão Abafada', 'Marcação (2)', 'Maceta Forte', 'Aro', 'Preparação', 'Sub-Grave'],
    baseFreqs: [95, 55, 58, 420, 62, 48]
  },
  {
    id: 'Surdo de Segunda',
    label: 'Surdo de Segunda (Resposta)',
    studioLabel: 'Surdo de Segunda (Resposta)',
    icon: 'drum',
    category: 'percussao',
    lineNames: ['Mão Abafada', 'Resposta (1)', 'Maceta Forte', 'Aro', 'Variação', 'Grave Médio'],
    baseFreqs: [120, 73.4, 78, 450, 82, 68]
  },
  {
    id: 'Surdo de Terceira',
    label: 'Surdo de Terceira (Cortador)',
    studioLabel: 'Surdo de Terceira (Cortador)',
    icon: 'drum',
    category: 'percussao',
    lineNames: ['Mão (Tapa)', 'Corte Aberto', 'Balanço', 'Subida/Rulo', 'Aro', 'Virada'],
    baseFreqs: [165, 104, 98, 115, 490, 92]
  }
];

export const MELODIC_INSTRUMENTS = SUPPORTED_INSTRUMENTS.filter(
  i => i.category === 'cordas-teclas'
);

export const PERCUSSION_INSTRUMENTS = SUPPORTED_INSTRUMENTS.filter(
  i => i.category === 'percussao'
);

export function getInstrumentConfig(rawId: string): InstrumentConfig {
  const normalized = normalizeInstrumentId(rawId);
  return SUPPORTED_INSTRUMENTS.find(i => i.id === normalized) || SUPPORTED_INSTRUMENTS[0];
}

export function normalizeInstrumentId(raw: string): string {
  const lower = (raw || '').trim().toLowerCase();
  if (lower.includes('cavaco') || lower.includes('cavaquinho') || lower.includes('ukulele')) return 'Cavaquinho';
  if (lower.includes('baixo')) return 'Baixo';
  if (lower.includes('guitarra')) return 'Guitarra';
  if (lower.includes('teclado') || lower.includes('piano')) return 'Teclado';
  if (lower.includes('escaleta') || lower.includes('sanfona')) return 'Escaleta';
  if (lower.includes('bateria')) return 'Bateria';
  if (lower.includes('caixa')) return 'Caixa';
  if (lower.includes('timbal')) return 'Timbal';
  if (lower.includes('alfaia')) return 'Alfaia';
  if (lower.includes('agogo') || lower.includes('agogô')) return 'Agogô';
  if (lower.includes('repinique') || lower.includes('repique')) return 'Repinique';
  if (lower.includes('tamborim')) return 'Tamborim';
  if (lower.includes('primeira') || lower.includes('surdo 1')) return 'Surdo de Primeira';
  if (lower.includes('segunda') || lower.includes('surdo 2')) return 'Surdo de Segunda';
  if (lower.includes('terceira') || lower.includes('terceria') || lower.includes('cortador') || lower.includes('surdo 3')) {
    return 'Surdo de Terceira';
  }
  return 'Violão';
}
