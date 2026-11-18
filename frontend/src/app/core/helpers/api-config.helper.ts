/**
 * Resolução centralizada da URL base da API.
 * Evita duplicação entre AuthService, SongService e PlaylistService.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('rafaelacuoco.com.br')) {
      return 'https://cifratransback.rafaelacuoco.com.br/api';
    }
  }
  return 'http://localhost:5512/api';
}
