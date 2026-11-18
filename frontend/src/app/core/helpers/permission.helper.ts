import { TransicionaisUserSession } from '../models/playlist.model';

/**
 * Helpers centralizados de verificação de permissão e autoria.
 */
export function isAdminUser(user: TransicionaisUserSession | null | undefined): boolean {
  return !!user && user.role === 'admin';
}

export function canEditSong(
  song: { creatorUserId?: string | null } | null | undefined,
  user: TransicionaisUserSession | null | undefined
): boolean {
  if (!user || !song) return false;
  if (isAdminUser(user)) return true;
  if (!song.creatorUserId) return true;
  return song.creatorUserId.toLowerCase() === user.userId.toLowerCase();
}

export function canManagePlaylistVisibility(
  playlist: { externalUserId?: string | null } | null | undefined,
  user: TransicionaisUserSession | null | undefined
): boolean {
  if (!user || !playlist) return false;
  if (isAdminUser(user)) return true;
  if (!playlist.externalUserId) return true;
  return playlist.externalUserId.toLowerCase() === user.userId.toLowerCase();
}
