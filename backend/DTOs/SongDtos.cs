namespace CifraTrans.Api.DTOs;

public record CreateSongDto(
    string Title,
    string Artist,
    string OriginalKey = "C",
    int? Bpm = null,
    List<CreateTrackDto>? Tracks = null,
    List<CreateChordDto>? Chords = null
);

public record CreateTrackDto(
    string Instrument,
    string Content,
    string? Difficulty = "Médio",
    string? Tuning = "Padrão (E A D G B E)",
    int Capo = 0
);

public record CreateChordDto(
    string Name,
    string Instrument = "Violão",
    string Diagram = "",
    int BaseFret = 1
);
