namespace CifraTrans.Api.Models;

public class Chord
{
    public int Id { get; set; }
    public int? SongId { get; set; }
    public Song? Song { get; set; }

    // Nome do acorde (ex: "Am", "C", "G7", "F#m7")
    public string Name { get; set; } = string.Empty;

    // Instrumento de referência para o diagrama (ex: "Violão", "Ukulele", "Teclado")
    public string Instrument { get; set; } = "Violão";

    // Representação do diagrama (ex: trastes/dedos "x,0,2,2,1,0")
    public string Diagram { get; set; } = string.Empty;

    // Traste inicial caso seja acorde com pestana mais aguda (default 1)
    public int BaseFret { get; set; } = 1;
}
