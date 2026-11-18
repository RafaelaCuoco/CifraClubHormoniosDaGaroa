namespace CifraTrans.Api.Models;

public class PlaylistVote
{
    public int Id { get; set; }
    public int PlaylistTrackId { get; set; }
    public PlaylistTrack? PlaylistTrack { get; set; }

    public int VoterId { get; set; }
    public Voter? Voter { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
