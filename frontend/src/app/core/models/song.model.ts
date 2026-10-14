export interface InstrumentTrack {
  id: number;
  songId: number;
  instrument: string;
  content: string;
  difficulty: string;
  tuning: string;
  capo: number;
  createdAt: string;
}

export interface Chord {
  id: number;
  songId?: number;
  name: string;
  instrument: string;
  diagram: string;
  baseFret: number;
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  originalKey: string;
  bpm?: number;
  createdAt: string;
  tracks: InstrumentTrack[];
  chords: Chord[];
}

export interface SongSummary {
  id: number;
  title: string;
  artist: string;
  originalKey: string;
  bpm?: number;
  createdAt: string;
  availableInstruments: string[];
  tracksCount: number;
}

export interface CreateTrackPayload {
  instrument: string;
  content: string;
  difficulty?: string;
  tuning?: string;
  capo?: number;
}

export interface CreateChordPayload {
  name: string;
  instrument?: string;
  diagram?: string;
  baseFret?: number;
}

export interface CreateSongPayload {
  title: string;
  artist: string;
  originalKey?: string;
  bpm?: number;
  tracks?: CreateTrackPayload[];
  chords?: CreateChordPayload[];
}
