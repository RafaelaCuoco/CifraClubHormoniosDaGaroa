import { Song } from './song.model';

export interface TransicionaisOrganizationOption {
  customId: string;
  name: string;
  role: string;
}

export interface TransicionaisUserSession {
  token: string;
  refresh: string;
  userId: string;
  profileId?: number | null;
  username: string;
  displayName: string;
  email?: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  groups?: string[];
  expiresAt?: number;
}

export interface TransicionaisLoginResponse extends TransicionaisUserSession {
  requiresOrgSelection: boolean;
  requiresValidation?: boolean;
  status?: string;
  name?: string;
  validationCode?: string;
  message?: string;
  selectionToken?: string;
  organizations?: TransicionaisOrganizationOption[];
}

export interface TransicionaisRegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  customId?: string;
  inviteToken?: string;
  inviteCode?: string;
}

export interface TransicionaisRegisterResponse {
  requiresValidation: boolean;
  status: string;
  username: string;
  email: string;
  name: string;
  organizationName?: string;
  validationCode?: string;
  message: string;
}

export interface PendingRegistrationItem {
  id: number;
  userId: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  organizationName: string;
  status: string;
  validationCode: string;
  createdAt: string;
  validatedAt?: string | null;
}

export interface Voter {
  id: number;
  name: string;
  createdAt?: string;
  votesCount?: number;
}

export interface PlaylistTrack {
  id: number;
  playlistId: number;
  spotifyTrackId: string;
  spotifyTrackUri: string;
  title: string;
  artist: string;
  durationMs: number;
  previewUrl?: string | null;
  trackOrder: number;
  songId?: number | null;
  votesCount: number;
  voters: string[];
}

export interface PlaylistPreviewTrack {
  id: number;
  title: string;
  artist: string;
  songId?: number | null;
  votesCount: number;
}

export interface PlaylistSummary {
  id: number;
  spotifyPlaylistId: string;
  spotifyUrl: string;
  name: string;
  ownerName: string;
  coverImageUrl?: string | null;
  isCustomCreated: boolean;
  sourcePlaylistId?: number | null;
  profileName: string;
  externalUserId?: string | null;
  externalProfileId?: number | null;
  organizationName?: string | null;
  description?: string | null;
  isSharedOnHome: boolean;
  votingEnabled: boolean;
  createdAt: string;
  tracksCount: number;
  importedSongsCount?: number;
  totalVotes: number;
  previewTracks?: PlaylistPreviewTrack[];
}

export interface PlaylistDetail extends PlaylistSummary {
  tracks: PlaylistTrack[];
}

export interface UpdatePlaylistSettingsPayload {
  name?: string;
  profileName?: string;
  externalUserId?: string | null;
  externalProfileId?: number | null;
  organizationName?: string | null;
  description?: string;
  isSharedOnHome?: boolean;
  votingEnabled?: boolean;
}

export interface VoteResponse {
  trackId: number;
  playlistId: number;
  voted: boolean;
  voter: { id: number; name: string };
  votesCount: number;
  voters: string[];
  allVoters: Voter[];
}

export interface GeneratePlaylistPayload {
  name: string;
  minVotes: number;
  topLimit?: number | null;
  selectedTrackIds?: number[] | null;
  spotifyAccessToken?: string | null;
  profileName?: string | null;
  externalUserId?: string | null;
  externalProfileId?: number | null;
  organizationName?: string | null;
  description?: string | null;
  isSharedOnHome?: boolean;
  votingEnabled?: boolean;
  importToSongs?: boolean;
}

export interface GeneratePlaylistResponse {
  playlist: PlaylistDetail;
  spotifyExported: boolean;
  spotifyUrl: string;
  spotifyWarning?: string | null;
  spotifyTrackUris: string[];
  spotifyTrackLinks: string[];
}

export interface ImportTrackToSongResponse {
  trackId: number;
  songId: number;
  createdNew: boolean;
  song: Song;
}

export interface BatchImportToSongsResponse {
  playlistId: number;
  totalProcessed: number;
  createdCount: number;
  linkedCount: number;
  firstSongId?: number;
  playlist: PlaylistDetail;
}
