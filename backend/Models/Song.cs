namespace CifraTrans.Api.Models;

public class Song
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string OriginalKey { get; set; } = "C";
    public int? Bpm { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Relacionamentos de Domínio
    public ICollection<InstrumentTrack> Tracks { get; set; } = new List<InstrumentTrack>();
    public ICollection<Chord> Chords { get; set; } = new List<Chord>();
}
