namespace CifraTrans.Api.DTOs;

public record CreateSongDto(
    string Title,
    string Artist,
    string OriginalKey = "C",
    int? Bpm = null,
    bool IsPublic = true,
    string? CreatorUserId = null,
    string? CreatorName = null,
    List<CreateTrackDto>? Tracks = null,
    List<CreateChordDto>? Chords = null
);

public record UpdateSongVisibilityDto(bool IsPublic, string? CreatorUserId = null);

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
