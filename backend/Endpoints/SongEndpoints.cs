using CifraTrans.Api.Data;
using CifraTrans.Api.DTOs;
using CifraTrans.Api.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CifraTrans.Api.Endpoints;

public static class SongEndpoints
{
    public static WebApplication MapSongEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/songs");
        MapRoutes(group);
        return app;
    }

    public static RouteGroupBuilder MapSongEndpoints(this RouteGroupBuilder group)
    {
        MapRoutes(group);
        return group;
    }

    public static IEndpointRouteBuilder MapSongEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/songs");
        MapRoutes(group);
        return routes;
    }

    private static RouteGroupBuilder MapRoutes(RouteGroupBuilder group)
    {
        // GET /api/songs - Listar músicas públicas + músicas privadas do próprio usuário logado
        group.MapGet("/", async (string? userId, AppDbContext db) =>
        {
            var songs = await db.Songs
                .AsNoTracking()
                .Where(s => s.IsPublic || (!string.IsNullOrEmpty(userId) && s.CreatorUserId == userId))
                .Select(s => new
                {
                    s.Id,
                    s.Title,
                    s.Artist,
                    s.OriginalKey,
                    s.Bpm,
                    s.IsPublic,
                    s.CreatorUserId,
                    s.CreatorName,
                    s.CreatedAt,
                    AvailableInstruments = s.Tracks.Select(t => t.Instrument).ToList(),
                    TracksCount = s.Tracks.Count
                })
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();

            return Results.Ok(songs);
        });

        // GET /api/songs/{id:int} - Buscar música completa por ID com tracks e acordes
        group.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var song = await db.Songs
                .Include(s => s.Tracks)
                .Include(s => s.Chords)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id);

            if (song is null)
            {
                return Results.NotFound(new { message = $"Música com ID {id} não encontrada." });
            }

            return Results.Ok(song);
        });

        // POST /api/songs - Criar nova música (Exige usuário logado)
        group.MapPost("/", async (CreateSongDto dto, HttpRequest request, AppDbContext db) =>
        {
            var authHeader = request.Headers.Authorization.ToString();
            if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(dto.CreatorUserId))
            {
                return Results.Json(
                    new { message = "Você precisa estar logado no sistema para criar uma cifra ou página de notas." },
                    statusCode: StatusCodes.Status401Unauthorized);
            }

            if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Artist))
            {
                return Results.BadRequest(new { message = "Título e Artista são obrigatórios." });
            }

            var song = new Song
            {
                Title = dto.Title.Trim(),
                Artist = dto.Artist.Trim(),
                OriginalKey = string.IsNullOrWhiteSpace(dto.OriginalKey) ? "C" : dto.OriginalKey.Trim(),
                Bpm = dto.Bpm,
                IsPublic = dto.IsPublic,
                CreatorUserId = dto.CreatorUserId,
                CreatorName = dto.CreatorName,
                CreatedAt = DateTime.UtcNow
            };

            if (dto.Tracks is not null && dto.Tracks.Count > 0)
            {
                foreach (var trackDto in dto.Tracks)
                {
                    song.Tracks.Add(new InstrumentTrack
                    {
                        Instrument = trackDto.Instrument,
                        Content = trackDto.Content,
                        Difficulty = trackDto.Difficulty ?? "Médio",
                        Tuning = trackDto.Tuning ?? "Padrão (E A D G B E)",
                        Capo = trackDto.Capo,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            if (dto.Chords is not null && dto.Chords.Count > 0)
            {
                foreach (var chordDto in dto.Chords)
                {
                    song.Chords.Add(new Chord
                    {
                        Name = chordDto.Name,
                        Instrument = chordDto.Instrument,
                        Diagram = chordDto.Diagram,
                        BaseFret = chordDto.BaseFret
                    });
                }
            }

            db.Songs.Add(song);
            await db.SaveChangesAsync();

            return Results.Created($"/api/songs/{song.Id}", song);
        });

        // PATCH /api/songs/{id:int}/visibility - Alternar visibilidade Pública/Privada da Cifra (Valida Autoria)
        group.MapPatch("/{id:int}/visibility", async (int id, UpdateSongVisibilityDto dto, HttpRequest request, AppDbContext db) =>
        {
            var authHeader = request.Headers.Authorization.ToString();
            if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(dto.CreatorUserId))
            {
                return Results.Json(
                    new { message = "Faça login para alterar a visibilidade desta cifra." },
                    statusCode: StatusCodes.Status401Unauthorized);
            }

            var song = await db.Songs.FindAsync(id);
            if (song is null)
            {
                return Results.NotFound(new { message = $"Música com ID {id} não encontrada." });
            }

            var (requesterUserId, isAdmin) = ExtractRequesterIdentity(authHeader, dto.CreatorUserId);
            if (!isAdmin &&
                !string.IsNullOrWhiteSpace(song.CreatorUserId) &&
                !string.IsNullOrWhiteSpace(requesterUserId) &&
                !string.Equals(song.CreatorUserId, requesterUserId, StringComparison.OrdinalIgnoreCase))
            {
                return Results.Json(
                    new { message = "Apenas o autor da cifra ou um administrador pode alterar sua visibilidade." },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            if (string.IsNullOrWhiteSpace(song.CreatorUserId) && !string.IsNullOrWhiteSpace(requesterUserId))
            {
                song.CreatorUserId = requesterUserId;
            }

            song.IsPublic = dto.IsPublic;
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                song.Id,
                song.IsPublic,
                song.CreatorUserId,
                song.CreatorName
            });
        });

        // POST /api/songs/{id:int}/tracks - Adicionar nova tablatura/faixa de instrumento (Exige usuário logado)
        group.MapPost("/{id:int}/tracks", async (int id, CreateTrackDto trackDto, HttpRequest request, AppDbContext db) =>
        {
            var authHeader = request.Headers.Authorization.ToString();
            if (string.IsNullOrWhiteSpace(authHeader))
            {
                return Results.Json(
                    new { message = "Você precisa estar logado para adicionar faixas." },
                    statusCode: StatusCodes.Status401Unauthorized);
            }

            var song = await db.Songs.FindAsync(id);
            if (song is null)
            {
                return Results.NotFound(new { message = $"Música com ID {id} não encontrada." });
            }

            if (string.IsNullOrWhiteSpace(trackDto.Content) || string.IsNullOrWhiteSpace(trackDto.Instrument))
            {
                return Results.BadRequest(new { message = "Instrumento e Conteúdo da tablatura são obrigatórios." });
            }

            var track = new InstrumentTrack
            {
                SongId = song.Id,
                Instrument = trackDto.Instrument.Trim(),
                Content = trackDto.Content,
                Difficulty = trackDto.Difficulty ?? "Médio",
                Tuning = trackDto.Tuning ?? "Padrão (E A D G B E)",
                Capo = trackDto.Capo,
                CreatedAt = DateTime.UtcNow
            };

            db.InstrumentTracks.Add(track);
            await db.SaveChangesAsync();

            return Results.Created($"/api/songs/{id}/tracks/{track.Id}", track);
        });

        // PUT /api/songs/{id:int} - Atualizar música existente e suas faixas (Exige usuário logado)
        group.MapPut("/{id:int}", async (int id, CreateSongDto dto, HttpRequest request, AppDbContext db) =>
        {
            var authHeader = request.Headers.Authorization.ToString();
            if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(dto.CreatorUserId))
            {
                return Results.Json(
                    new { message = "Você precisa estar logado para editar cifras." },
                    statusCode: StatusCodes.Status401Unauthorized);
            }

            var song = await db.Songs
                .Include(s => s.Tracks)
                .Include(s => s.Chords)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (song is null)
            {
                return Results.NotFound(new { message = $"Música com ID {id} não encontrada." });
            }

            var (requesterUserId, isAdmin) = ExtractRequesterIdentity(authHeader, dto.CreatorUserId);
            if (!isAdmin &&
                !string.IsNullOrWhiteSpace(song.CreatorUserId) &&
                !string.IsNullOrWhiteSpace(requesterUserId) &&
                !string.Equals(song.CreatorUserId, requesterUserId, StringComparison.OrdinalIgnoreCase))
            {
                return Results.Json(
                    new { message = "Apenas o autor da cifra ou um administrador pode editar este conteúdo." },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Artist))
            {
                return Results.BadRequest(new { message = "Título e Artista são obrigatórios." });
            }

            song.Title = dto.Title.Trim();
            song.Artist = dto.Artist.Trim();
            song.OriginalKey = string.IsNullOrWhiteSpace(dto.OriginalKey) ? "C" : dto.OriginalKey.Trim();
            song.Bpm = dto.Bpm;
            song.IsPublic = dto.IsPublic;
            if (!string.IsNullOrWhiteSpace(dto.CreatorUserId) && string.IsNullOrWhiteSpace(song.CreatorUserId))
            {
                song.CreatorUserId = dto.CreatorUserId;
                song.CreatorName = dto.CreatorName;
            }

            if (dto.Tracks is not null && dto.Tracks.Count > 0)
            {
                foreach (var trackDto in dto.Tracks)
                {
                    var existingTrack = song.Tracks.FirstOrDefault(t => 
                        t.Instrument.Equals(trackDto.Instrument, StringComparison.OrdinalIgnoreCase));

                    if (existingTrack is not null)
                    {
                        existingTrack.Content = trackDto.Content;
                        existingTrack.Difficulty = trackDto.Difficulty ?? existingTrack.Difficulty;
                        existingTrack.Tuning = trackDto.Tuning ?? existingTrack.Tuning;
                        existingTrack.Capo = trackDto.Capo;
                    }
                    else
                    {
                        song.Tracks.Add(new InstrumentTrack
                        {
                            SongId = song.Id,
                            Instrument = trackDto.Instrument,
                            Content = trackDto.Content,
                            Difficulty = trackDto.Difficulty ?? "Médio",
                            Tuning = trackDto.Tuning ?? "Padrão (E A D G B E)",
                            Capo = trackDto.Capo,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(song);
        });

        // POST /api/songs/seed - Popula uma música de demonstração se a base estiver vazia
        group.MapPost("/seed", async (AppDbContext db) =>
        {
            if (await db.Songs.AnyAsync())
            {
                return Results.Ok(new { message = "Banco de dados já contém músicas cadastradas." });
            }

            var demoSong = new Song
            {
                Title = "Tempo Perdido",
                Artist = "Legião Urbana",
                OriginalKey = "C",
                Bpm = 126,
                IsPublic = true,
                CreatorName = "Cifra Trans Oficial",
                CreatedAt = DateTime.UtcNow,
                Tracks = new List<InstrumentTrack>
                {
                    new()
                    {
                        Instrument = "Violão",
                        Difficulty = "Fácil",
                        Tuning = "Padrão (E A D G B E)",
                        Capo = 0,
                        Content = @"[C] Todos os dias quando [Am]acordo
Não tenho mais o [Em]tempo que passou
Mas tenho muito [F]tempo:
Temos todo o [G]tempo do mundo

[C] Todos os dias antes de [Am]dormir
Lembro e esqueço como [Em]foi o dia:
Sempre em frente, [F]não temos tempo a [G]perder

[Am] Nosso suor sagrado
[Em] É bem mais belo que esse sangue amargo
[F] E tão sério
[G] E selvagem"
                    },
                    new()
                    {
                        Instrument = "Guitarra",
                        Difficulty = "Médio",
                        Tuning = "Padrão (E A D G B E)",
                        Capo = 0,
                        Content = @"[Intro - Riff Principal]
e|---------------------------------------|
B|-------1---------------1---------------|
G|-----0---0-----------2---2-------------|
D|---2-------2-------2-------2-----------|
A|-3-----------3---0-----------0---------|
E|---------------------------------------|

[C] Todos os dias quando [Am]acordo... (Guitarra Base com Chorus)"
                    }
                },
                Chords = new List<Chord>
                {
                    new() { Name = "C", Instrument = "Violão", Diagram = "x,3,2,0,1,0", BaseFret = 1 },
                    new() { Name = "Am", Instrument = "Violão", Diagram = "x,0,2,2,1,0", BaseFret = 1 },
                    new() { Name = "Em", Instrument = "Violão", Diagram = "0,2,2,0,0,0", BaseFret = 1 },
                    new() { Name = "F", Instrument = "Violão", Diagram = "1,3,3,2,1,1", BaseFret = 1 },
                    new() { Name = "G", Instrument = "Violão", Diagram = "3,2,0,0,0,3", BaseFret = 1 }
                }
            };

            db.Songs.Add(demoSong);
            await db.SaveChangesAsync();

            return Results.Created($"/api/songs/{demoSong.Id}", demoSong);
        });

        return group;
    }

    private static (string? UserId, bool IsAdmin) ExtractRequesterIdentity(string? authHeader, string? dtoUserId)
    {
        bool isAdmin = false;
        string? tokenUserId = null;

        if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader.Substring("Bearer ".Length).Trim();
            if (token.StartsWith("basic-docs-", StringComparison.OrdinalIgnoreCase))
            {
                isAdmin = true;
            }
            else if (token.StartsWith("active-", StringComparison.OrdinalIgnoreCase))
            {
                // Formato: active-{userId}-{guid32}
                var withoutPrefix = token.Substring("active-".Length);
                var lastDash = withoutPrefix.LastIndexOf('-');
                if (lastDash > 0)
                {
                    tokenUserId = withoutPrefix.Substring(0, lastDash);
                }
            }
        }

        return (!string.IsNullOrWhiteSpace(dtoUserId) ? dtoUserId.Trim() : tokenUserId, isAdmin);
    }
}
