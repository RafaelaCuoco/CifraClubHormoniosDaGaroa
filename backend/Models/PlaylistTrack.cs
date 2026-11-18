namespace CifraTrans.Api.Models;

public class PlaylistTrack
{
    public int Id { get; set; }
    public int PlaylistId { get; set; }
    public Playlist? Playlist { get; set; }

    public string SpotifyTrackUri { get; set; } = string.Empty;
    public string SpotifyTrackId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public int DurationMs { get; set; }
    public string? PreviewUrl { get; set; }
    public int TrackOrder { get; set; }

    // Vínculo com a base de páginas de notas/cifras do Cifra Trans
    public int? SongId { get; set; }

    public ICollection<PlaylistVote> Votes { get; set; } = new List<PlaylistVote>();
}
