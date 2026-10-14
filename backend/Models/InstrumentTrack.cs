namespace CifraTrans.Api.Models;

public class InstrumentTrack
{
    public int Id { get; set; }
    public int SongId { get; set; }
    public Song? Song { get; set; }

    // Instrumento: Ex: "Violão", "Guitarra", "Cavaco", "Ukulele", "Teclado"
    public string Instrument { get; set; } = "Violão";
    
    // Conteúdo da cifra/tablatura com marcação sincronizada (ex: [Am]Texto [C]letra...)
    public string Content { get; set; } = string.Empty;

    public string Difficulty { get; set; } = "Médio";
    public string Tuning { get; set; } = "Padrão (E A D G B E)";
    public int Capo { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
