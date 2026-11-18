namespace CifraTrans.Api.Models;

public class Song
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string OriginalKey { get; set; } = "C";
    public int? Bpm { get; set; }

    // Dono do conteúdo e controle de visibilidade (Público vs Privado)
    public string? CreatorUserId { get; set; }
    public string? CreatorName { get; set; }
    public bool IsPublic { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Relacionamentos de Domínio
    public ICollection<InstrumentTrack> Tracks { get; set; } = new List<InstrumentTrack>();
    public ICollection<Chord> Chords { get; set; } = new List<Chord>();
}
