namespace CifraTrans.Api.Models;

public class Playlist
{
    public int Id { get; set; }
    public string SpotifyPlaylistId { get; set; } = string.Empty;
    public string SpotifyUrl { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public bool IsCustomCreated { get; set; }
    public int? SourcePlaylistId { get; set; }

    // Vínculo com Perfil Autenticado (API Transicionais), Compartilhamento na Home e Votação Opcional
    public string ProfileName { get; set; } = string.Empty;
    public string? ExternalUserId { get; set; }
    public int? ExternalProfileId { get; set; }
    public string? OrganizationName { get; set; }
    public string? Description { get; set; }
    public bool IsSharedOnHome { get; set; } = true;
    public bool VotingEnabled { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PlaylistTrack> Tracks { get; set; } = new List<PlaylistTrack>();
}
