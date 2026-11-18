using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using CifraTrans.Api.Data;
using CifraTrans.Api.DTOs;
using CifraTrans.Api.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace CifraTrans.Api.Endpoints;

public static class PlaylistEndpoints
{
    private const string DefaultSpotifyPlaylistUrl = "https://open.spotify.com/playlist/6q8HxGekCdXiI87fJzxWR4?si=vPTxbtBUTauY_lX4MbIZpg";

    public static WebApplication MapPlaylistEndpoints(this WebApplication app)
    {
        var playlistGroup = app.MapGroup("/api/playlists");
        MapPlaylistRoutes(playlistGroup);

        var voterGroup = app.MapGroup("/api/voters");
        MapVoterRoutes(voterGroup);

        return app;
    }

    private static void MapVoterRoutes(RouteGroupBuilder group)
    {
        // GET /api/voters - Lista todas as pessoas/perfis cadastrados para reutilização rápida
        group.MapGet("/", async (AppDbContext db) =>
        {
            var voters = await db.Voters
                .AsNoTracking()
                .OrderBy(v => v.Name)
                .Select(v => new
                {
                    v.Id,
                    v.Name,
                    v.CreatedAt,
                    VotesCount = v.Votes.Count
                })
                .ToListAsync();

            return Results.Ok(voters);
        });

        // POST /api/voters - Cadastra ou reutiliza uma pessoa/perfil pelo nome (Exige login)
        group.MapPost("/", async (CreateVoterDto dto, HttpRequest request, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Headers.Authorization))
            {
                return Results.Json(new { message = "Faça login para cadastrar pessoas na lista." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            var cleanName = NormalizeName(dto.Name);
            if (string.IsNullOrWhiteSpace(cleanName))
            {
                return Results.BadRequest(new { message = "Informe o nome da pessoa ou perfil." });
            }

            var voter = await EnsurePersonRegisteredAsync(cleanName, db);

            return Results.Ok(new
            {
                voter.Id,
                voter.Name,
                voter.CreatedAt
            });
        });
    }

    private static void MapPlaylistRoutes(RouteGroupBuilder group)
    {
        // GET /api/playlists - Lista playlists públicas + playlists privadas do próprio usuário logado
        group.MapGet("/", async (string? userId, AppDbContext db) =>
        {
            var playlists = await db.Playlists
                .AsNoTracking()
                .Where(p => p.IsSharedOnHome || (!string.IsNullOrEmpty(userId) && p.ExternalUserId == userId))
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.SpotifyPlaylistId,
                    p.SpotifyUrl,
                    p.Name,
                    p.OwnerName,
                    p.CoverImageUrl,
                    p.IsCustomCreated,
                    p.SourcePlaylistId,
                    ProfileName = string.IsNullOrEmpty(p.ProfileName) ? p.OwnerName : p.ProfileName,
                    p.ExternalUserId,
                    p.ExternalProfileId,
                    p.OrganizationName,
                    p.Description,
                    p.IsSharedOnHome,
                    p.VotingEnabled,
                    p.CreatedAt,
                    TracksCount = p.Tracks.Count,
                    ImportedSongsCount = p.Tracks.Count(t => t.SongId != null),
                    TotalVotes = p.Tracks.SelectMany(t => t.Votes).Count()
                })
                .ToListAsync();

            return Results.Ok(playlists);
        });

        // GET /api/playlists/shared - Lista playlists públicas na página inicial (e privadas do próprio usuário logado se filtrar)
        group.MapGet("/shared", async (string? userId, AppDbContext db) =>
        {
            var shared = await db.Playlists
                .AsNoTracking()
                .Where(p => p.IsSharedOnHome || (!string.IsNullOrEmpty(userId) && p.ExternalUserId == userId))
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.SpotifyPlaylistId,
                    p.SpotifyUrl,
                    p.Name,
                    p.OwnerName,
                    p.CoverImageUrl,
                    p.IsCustomCreated,
                    p.SourcePlaylistId,
                    ProfileName = string.IsNullOrEmpty(p.ProfileName) ? p.OwnerName : p.ProfileName,
                    p.ExternalUserId,
                    p.ExternalProfileId,
                    p.OrganizationName,
                    p.Description,
                    p.IsSharedOnHome,
                    p.VotingEnabled,
                    p.CreatedAt,
                    TracksCount = p.Tracks.Count,
                    ImportedSongsCount = p.Tracks.Count(t => t.SongId != null),
                    TotalVotes = p.Tracks.SelectMany(t => t.Votes).Count(),
                    PreviewTracks = p.Tracks
                        .OrderByDescending(t => t.Votes.Count)
                        .ThenBy(t => t.TrackOrder)
                        .Take(4)
                        .Select(t => new
                        {
                            t.Id,
                            t.Title,
                            t.Artist,
                            t.SongId,
                            VotesCount = t.Votes.Count
                        })
                        .ToList()
                })
                .ToListAsync();

            return Results.Ok(shared);
        });

        // GET /api/playlists/{id:int} - Retorna uma playlist completa com faixas, vínculos Cifra Trans e votos
        group.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            await SyncPlaylistTracksWithExistingSongsAsync(id, db);
            var playlist = await FetchPlaylistDtoAsync(id, db);
            if (playlist is null)
            {
                return Results.NotFound(new { message = $"Playlist {id} não encontrada." });
            }

            return Results.Ok(playlist);
        });

        // PUT /api/playlists/{id:int}/settings - Salva no perfil logado, define Público/Privado e alterna votação (Exige login)
        group.MapPut("/{id:int}/settings", async (int id, UpdatePlaylistSettingsDto dto, HttpRequest request, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Headers.Authorization) && string.IsNullOrWhiteSpace(dto.ExternalUserId))
            {
                return Results.Json(new { message = "Você precisa estar logado para salvar ou alterar configurações de uma playlist." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            var playlist = await db.Playlists.FirstOrDefaultAsync(p => p.Id == id);
            if (playlist is null)
            {
                return Results.NotFound(new { message = $"Playlist {id} não encontrada." });
            }

            var authHeader = request.Headers.Authorization.ToString();
            var (requesterUserId, isAdmin) = ExtractRequesterIdentity(authHeader, dto.ExternalUserId);
            if (dto.IsSharedOnHome.HasValue &&
                !isAdmin &&
                !string.IsNullOrWhiteSpace(playlist.ExternalUserId) &&
                !string.IsNullOrWhiteSpace(requesterUserId) &&
                !string.Equals(playlist.ExternalUserId, requesterUserId, StringComparison.OrdinalIgnoreCase))
            {
                return Results.Json(
                    new { message = "Apenas o proprietário da playlist ou um administrador pode alterar a visibilidade Pública/Privada." },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
            {
                playlist.Name = dto.Name.Trim();
            }

            if (dto.ProfileName is not null)
            {
                var cleanProfile = NormalizeName(dto.ProfileName);
                playlist.ProfileName = cleanProfile;
                if (!string.IsNullOrWhiteSpace(cleanProfile))
                {
                    await EnsurePersonRegisteredAsync(cleanProfile, db);
                }
            }

            if (dto.ExternalUserId is not null)
            {
                playlist.ExternalUserId = dto.ExternalUserId;
            }

            if (dto.ExternalProfileId.HasValue)
            {
                playlist.ExternalProfileId = dto.ExternalProfileId.Value;
            }

            if (dto.OrganizationName is not null)
            {
                playlist.OrganizationName = dto.OrganizationName;
            }

            if (dto.Description is not null)
            {
                playlist.Description = dto.Description.Trim();
            }

            if (dto.IsSharedOnHome.HasValue)
            {
                playlist.IsSharedOnHome = dto.IsSharedOnHome.Value;
            }

            if (dto.VotingEnabled.HasValue)
            {
                playlist.VotingEnabled = dto.VotingEnabled.Value;
            }

            await db.SaveChangesAsync();

            var updatedDto = await FetchPlaylistDtoAsync(id, db);
            return Results.Ok(updatedDto);
        });

        // POST /api/playlists/seed-default - Importa automaticamente a playlist padrão se ainda não existir
        group.MapPost("/seed-default", async (AppDbContext db, IHttpClientFactory httpClientFactory, IMemoryCache cache) =>
        {
            var existing = await db.Playlists
                .AsNoTracking()
                .OrderBy(p => p.Id)
                .FirstOrDefaultAsync();

            if (existing is not null)
            {
                await SyncPlaylistTracksWithExistingSongsAsync(existing.Id, db);
                var dto = await FetchPlaylistDtoAsync(existing.Id, db);
                return Results.Ok(dto);
            }

            var imported = await ImportSpotifyPlaylistInternalAsync(
                DefaultSpotifyPlaylistUrl,
                null,
                null,
                null,
                null,
                true,
                false,
                db,
                httpClientFactory,
                cache);

            if (imported.Error is not null)
            {
                return Results.BadRequest(new { message = imported.Error });
            }

            await SyncPlaylistTracksWithExistingSongsAsync(imported.Playlist!.Id, db);
            var createdDto = await FetchPlaylistDtoAsync(imported.Playlist!.Id, db);
            return Results.Ok(createdDto);
        });

        // POST /api/playlists/import - Importa qualquer playlist pública do Spotify via link (Exige usuário logado)
        group.MapPost("/import", async (ImportPlaylistDto dto, HttpRequest request, AppDbContext db, IHttpClientFactory httpClientFactory, IMemoryCache cache) =>
        {
            if (string.IsNullOrWhiteSpace(request.Headers.Authorization) && string.IsNullOrWhiteSpace(dto.ExternalUserId))
            {
                return Results.Json(new { message = "Você precisa estar logado para importar uma nova playlist do Spotify." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            if (string.IsNullOrWhiteSpace(dto.PlaylistUrl))
            {
                return Results.BadRequest(new { message = "Informe a URL da playlist do Spotify." });
            }

            var result = await ImportSpotifyPlaylistInternalAsync(
                dto.PlaylistUrl,
                dto.ProfileName,
                dto.ExternalUserId,
                dto.ExternalProfileId,
                dto.OrganizationName,
                dto.IsSharedOnHome,
                dto.VotingEnabled,
                db,
                httpClientFactory,
                cache);

            if (result.Error is not null)
            {
                return Results.BadRequest(new { message = result.Error });
            }

            await SyncPlaylistTracksWithExistingSongsAsync(result.Playlist!.Id, db);
            var playlistDto = await FetchPlaylistDtoAsync(result.Playlist!.Id, db);
            return Results.Ok(playlistDto);
        });

        // POST /api/playlists/{playlistId:int}/tracks/{trackId:int}/import-to-song (Exige usuário logado)
        group.MapPost("/{playlistId:int}/tracks/{trackId:int}/import-to-song", async (
            int playlistId,
            int trackId,
            bool? isPublic,
            string? creatorUserId,
            string? creatorName,
            HttpRequest request,
            AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Headers.Authorization) && string.IsNullOrWhiteSpace(creatorUserId))
            {
                return Results.Json(new { message = "Faça login para importar músicas e criar páginas de notas no Cifra Trans." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            var track = await db.PlaylistTracks
                .FirstOrDefaultAsync(t => t.Id == trackId && t.PlaylistId == playlistId);

            if (track is null)
            {
                return Results.NotFound(new { message = "Faixa não encontrada nesta playlist." });
            }

            var (song, createdNew) = await CreateOrGetSongFromTrackAsync(
                track,
                "Violão",
                "C",
                isPublic ?? true,
                creatorUserId,
                creatorName,
                db);

            return Results.Ok(new
            {
                trackId = track.Id,
                songId = song.Id,
                createdNew,
                song
            });
        });

        // POST /api/playlists/{playlistId:int}/import-to-songs (Exige usuário logado)
        group.MapPost("/{playlistId:int}/import-to-songs", async (int playlistId, ImportTracksToSongsDto dto, HttpRequest request, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Headers.Authorization) && string.IsNullOrWhiteSpace(dto.CreatorUserId))
            {
                return Results.Json(new { message = "Faça login para importar músicas para a base do Cifra Trans." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            var playlist = await db.Playlists
                .Include(p => p.Tracks)
                .ThenInclude(t => t.Votes)
                .FirstOrDefaultAsync(p => p.Id == playlistId);

            if (playlist is null)
            {
                return Results.NotFound(new { message = "Playlist não encontrada." });
            }

            IEnumerable<PlaylistTrack> targetTracks = playlist.Tracks.OrderBy(t => t.TrackOrder);

            if (dto.TrackIds is not null && dto.TrackIds.Count > 0)
            {
                var set = dto.TrackIds.ToHashSet();
                targetTracks = targetTracks.Where(t => set.Contains(t.Id));
            }
            else if (dto.OnlyVoted)
            {
                targetTracks = targetTracks.Where(t => t.Votes.Count > 0);
            }

            var tracksList = targetTracks.ToList();
            if (tracksList.Count == 0)
            {
                return Results.BadRequest(new { message = "Nenhuma faixa selecionada para importar para o Cifra Trans." });
            }

            int createdCount = 0;
            int linkedCount = 0;
            var importedSongIds = new List<int>();

            foreach (var track in tracksList)
            {
                var (song, createdNew) = await CreateOrGetSongFromTrackAsync(
                    track,
                    string.IsNullOrWhiteSpace(dto.DefaultInstrument) ? "Violão" : dto.DefaultInstrument.Trim(),
                    string.IsNullOrWhiteSpace(dto.DefaultKey) ? "C" : dto.DefaultKey.Trim(),
                    dto.IsPublic,
                    dto.CreatorUserId ?? playlist.ExternalUserId,
                    dto.CreatorName ?? playlist.ProfileName,
                    db);

                if (createdNew) createdCount++;
                else linkedCount++;

                importedSongIds.Add(song.Id);
            }

            var updatedPlaylist = await FetchPlaylistDtoAsync(playlistId, db);
            return Results.Ok(new
            {
                playlistId,
                totalProcessed = tracksList.Count,
                createdCount,
                linkedCount,
                firstSongId = importedSongIds.FirstOrDefault(),
                playlist = updatedPlaylist
            });
        });

        // POST /api/playlists/{playlistId:int}/tracks/{trackId:int}/vote (Exige usuário logado)
        group.MapPost("/{playlistId:int}/tracks/{trackId:int}/vote", async (int playlistId, int trackId, VoteTrackDto dto, HttpRequest request, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Headers.Authorization))
            {
                return Results.Json(new { message = "Faça login na plataforma para registrar votos." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            var cleanVoterName = NormalizeName(dto.VoterName);
            if (string.IsNullOrWhiteSpace(cleanVoterName))
            {
                return Results.BadRequest(new { message = "Informe quem está votando antes de votar." });
            }

            var track = await db.PlaylistTracks
                .FirstOrDefaultAsync(t => t.Id == trackId && t.PlaylistId == playlistId);

            if (track is null)
            {
                return Results.NotFound(new { message = "Faixa não encontrada nesta playlist." });
            }

            var voter = await EnsurePersonRegisteredAsync(cleanVoterName, db);

            var existingVote = await db.PlaylistVotes
                .FirstOrDefaultAsync(pv => pv.PlaylistTrackId == trackId && pv.VoterId == voter.Id);

            bool added;
            if (existingVote is not null)
            {
                db.PlaylistVotes.Remove(existingVote);
                added = false;
            }
            else
            {
                db.PlaylistVotes.Add(new PlaylistVote
                {
                    PlaylistTrackId = trackId,
                    VoterId = voter.Id,
                    CreatedAt = DateTime.UtcNow
                });
                added = true;
            }

            await db.SaveChangesAsync();

            var updatedTrackVotes = await db.PlaylistVotes
                .AsNoTracking()
                .Where(pv => pv.PlaylistTrackId == trackId)
                .Include(pv => pv.Voter)
                .OrderBy(pv => pv.CreatedAt)
                .Select(pv => new
                {
                    VoterId = pv.VoterId,
                    VoterName = pv.Voter != null ? pv.Voter.Name : string.Empty,
                    pv.CreatedAt
                })
                .ToListAsync();

            var allVoters = await db.Voters
                .AsNoTracking()
                .OrderBy(v => v.Name)
                .Select(v => new
                {
                    v.Id,
                    v.Name,
                    v.CreatedAt,
                    VotesCount = v.Votes.Count
                })
                .ToListAsync();

            return Results.Ok(new
            {
                trackId,
                playlistId,
                voted = added,
                voter = new { voter.Id, voter.Name },
                votesCount = updatedTrackVotes.Count,
                voters = updatedTrackVotes.Select(v => v.VoterName).ToList(),
                allVoters
            });
        });

        // POST /api/playlists/{playlistId:int}/generate - Cria uma nova playlist e salva no perfil logado (Exige login)
        group.MapPost("/{playlistId:int}/generate", async (int playlistId, GeneratePlaylistDto dto, HttpRequest request, AppDbContext db, IHttpClientFactory httpClientFactory) =>
        {
            if (string.IsNullOrWhiteSpace(request.Headers.Authorization) && string.IsNullOrWhiteSpace(dto.ExternalUserId))
            {
                return Results.Json(new { message = "Faça login na plataforma para criar uma nova playlist." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            var sourcePlaylist = await db.Playlists
                .Include(p => p.Tracks)
                .ThenInclude(t => t.Votes)
                .ThenInclude(v => v.Voter)
                .FirstOrDefaultAsync(p => p.Id == playlistId);

            if (sourcePlaylist is null)
            {
                return Results.NotFound(new { message = "Playlist de origem não encontrada." });
            }

            var newName = string.IsNullOrWhiteSpace(dto.Name)
                ? $"{sourcePlaylist.Name} - Selecionadas"
                : dto.Name.Trim();

            var cleanProfile = NormalizeName(dto.ProfileName);
            if (!string.IsNullOrWhiteSpace(cleanProfile))
            {
                await EnsurePersonRegisteredAsync(cleanProfile, db);
            }

            IEnumerable<PlaylistTrack> query = sourcePlaylist.Tracks;

            if (dto.SelectedTrackIds is not null && dto.SelectedTrackIds.Count > 0)
            {
                var idSet = dto.SelectedTrackIds.ToHashSet();
                query = query.Where(t => idSet.Contains(t.Id));
            }
            else if (dto.MinVotes > 0)
            {
                query = query.Where(t => t.Votes.Count >= dto.MinVotes);
            }

            var orderedTracks = query
                .OrderByDescending(t => t.Votes.Count)
                .ThenBy(t => t.TrackOrder)
                .ToList();

            if (dto.TopLimit.HasValue && dto.TopLimit.Value > 0)
            {
                orderedTracks = orderedTracks.Take(dto.TopLimit.Value).ToList();
            }

            if (orderedTracks.Count == 0)
            {
                return Results.BadRequest(new { message = "Nenhuma música atingiu o critério selecionado. Reduza o mínimo de votos para 0 se desejar incluir músicas sem voto." });
            }

            string createdSpotifyUrl = string.Empty;
            string createdSpotifyId = string.Empty;
            string? spotifyWarning = null;

            if (!string.IsNullOrWhiteSpace(dto.SpotifyAccessToken))
            {
                var spotifyExport = await TryCreateSpotifyRemotePlaylistAsync(
                    dto.SpotifyAccessToken.Trim(),
                    newName,
                    orderedTracks.Select(t => t.SpotifyTrackUri).Where(u => !string.IsNullOrWhiteSpace(u)).ToList(),
                    httpClientFactory);

                if (spotifyExport.Success)
                {
                    createdSpotifyId = spotifyExport.PlaylistId;
                    createdSpotifyUrl = spotifyExport.PlaylistUrl;
                }
                else
                {
                    spotifyWarning = spotifyExport.ErrorMessage;
                }
            }

            var newPlaylist = new Playlist
            {
                Name = newName,
                OwnerName = !string.IsNullOrWhiteSpace(cleanProfile) ? cleanProfile : sourcePlaylist.OwnerName,
                ProfileName = !string.IsNullOrWhiteSpace(cleanProfile) ? cleanProfile : sourcePlaylist.ProfileName,
                ExternalUserId = dto.ExternalUserId ?? sourcePlaylist.ExternalUserId,
                ExternalProfileId = dto.ExternalProfileId ?? sourcePlaylist.ExternalProfileId,
                OrganizationName = dto.OrganizationName ?? sourcePlaylist.OrganizationName,
                Description = dto.Description?.Trim(),
                IsSharedOnHome = dto.IsSharedOnHome,
                VotingEnabled = dto.VotingEnabled,
                CoverImageUrl = sourcePlaylist.CoverImageUrl,
                IsCustomCreated = true,
                SourcePlaylistId = sourcePlaylist.Id,
                SpotifyPlaylistId = createdSpotifyId,
                SpotifyUrl = createdSpotifyUrl,
                CreatedAt = DateTime.UtcNow
            };

            int order = 1;
            foreach (var srcTrack in orderedTracks)
            {
                var clonedTrack = new PlaylistTrack
                {
                    SpotifyTrackId = srcTrack.SpotifyTrackId,
                    SpotifyTrackUri = srcTrack.SpotifyTrackUri,
                    Title = srcTrack.Title,
                    Artist = srcTrack.Artist,
                    DurationMs = srcTrack.DurationMs,
                    PreviewUrl = srcTrack.PreviewUrl,
                    SongId = srcTrack.SongId,
                    TrackOrder = order++
                };

                foreach (var vote in srcTrack.Votes)
                {
                    clonedTrack.Votes.Add(new PlaylistVote
                    {
                        VoterId = vote.VoterId,
                        CreatedAt = vote.CreatedAt
                    });
                }

                newPlaylist.Tracks.Add(clonedTrack);
            }

            db.Playlists.Add(newPlaylist);
            await db.SaveChangesAsync();

            if (dto.ImportToSongs)
            {
                foreach (var track in newPlaylist.Tracks)
                {
                    await CreateOrGetSongFromTrackAsync(
                        track,
                        "Violão",
                        "C",
                        dto.IsSharedOnHome,
                        newPlaylist.ExternalUserId,
                        newPlaylist.ProfileName,
                        db);
                }
            }

            var resultDto = await FetchPlaylistDtoAsync(newPlaylist.Id, db);
            return Results.Ok(new
            {
                playlist = resultDto,
                spotifyExported = !string.IsNullOrWhiteSpace(createdSpotifyUrl),
                spotifyUrl = createdSpotifyUrl,
                spotifyWarning,
                spotifyTrackUris = orderedTracks.Select(t => t.SpotifyTrackUri).ToList(),
                spotifyTrackLinks = orderedTracks.Select(t => $"https://open.spotify.com/track/{t.SpotifyTrackId}").ToList()
            });
        });
    }

    private static async Task<Voter> EnsurePersonRegisteredAsync(string cleanName, AppDbContext db)
    {
        var voter = await db.Voters
            .FirstOrDefaultAsync(v => v.Name.ToLower() == cleanName.ToLower());

        if (voter is null)
        {
            voter = new Voter
            {
                Name = cleanName,
                CreatedAt = DateTime.UtcNow
            };
            db.Voters.Add(voter);
            await db.SaveChangesAsync();
        }

        return voter;
    }

    private static async Task SyncPlaylistTracksWithExistingSongsAsync(int playlistId, AppDbContext db)
    {
        var tracksWithoutSong = await db.PlaylistTracks
            .Where(t => t.PlaylistId == playlistId && t.SongId == null)
            .ToListAsync();

        if (tracksWithoutSong.Count == 0) return;

        var allSongs = await db.Songs
            .AsNoTracking()
            .Select(s => new { s.Id, s.Title, s.Artist })
            .ToListAsync();

        if (allSongs.Count == 0) return;

        bool changed = false;
        foreach (var track in tracksWithoutSong)
        {
            var matched = allSongs.FirstOrDefault(s =>
                s.Title.Equals(track.Title, StringComparison.OrdinalIgnoreCase) &&
                s.Artist.Equals(track.Artist, StringComparison.OrdinalIgnoreCase));

            if (matched is not null)
            {
                track.SongId = matched.Id;
                changed = true;
            }
        }

        if (changed)
        {
            await db.SaveChangesAsync();
        }
    }

    private static async Task<(Song Song, bool CreatedNew)> CreateOrGetSongFromTrackAsync(
        PlaylistTrack track,
        string defaultInstrument,
        string defaultKey,
        bool isPublic,
        string? creatorUserId,
        string? creatorName,
        AppDbContext db)
    {
        Song? existingSong = null;

        if (track.SongId.HasValue)
        {
            existingSong = await db.Songs
                .Include(s => s.Tracks)
                .Include(s => s.Chords)
                .FirstOrDefaultAsync(s => s.Id == track.SongId.Value);
        }

        if (existingSong is null)
        {
            existingSong = await db.Songs
                .Include(s => s.Tracks)
                .Include(s => s.Chords)
                .FirstOrDefaultAsync(s =>
                    s.Title.ToLower() == track.Title.ToLower() &&
                    s.Artist.ToLower() == track.Artist.ToLower());
        }

        if (existingSong is not null)
        {
            if (track.SongId != existingSong.Id)
            {
                track.SongId = existingSong.Id;
                await db.SaveChangesAsync();
            }
            return (existingSong, false);
        }

        var baseSheetContent = $@"[Intro]
[C]  [G]  [Am]  [F]

[Verso 1]
[C] Página base de notas e cifras para {track.Title} ({track.Artist})
[Am] Clique em Editar Cifra para escrever a letra e posicionar os acordes entre colchetes
[F] Use a transposição (+1/2 e -1/2) no topo para ajustar o tom em tempo real [G]

[Refrão]
[C] {track.Title} - [G] {track.Artist}
[Am] Cifra importada da playlist do Spotify [F] para o Cifra Trans";

        var newSong = new Song
        {
            Title = track.Title,
            Artist = track.Artist,
            OriginalKey = defaultKey,
            IsPublic = isPublic,
            CreatorUserId = creatorUserId,
            CreatorName = creatorName,
            CreatedAt = DateTime.UtcNow,
            Tracks = new List<InstrumentTrack>
            {
                new()
                {
                    Instrument = defaultInstrument,
                    Difficulty = "Médio",
                    Tuning = "Padrão (E A D G B E)",
                    Capo = 0,
                    Content = baseSheetContent,
                    CreatedAt = DateTime.UtcNow
                }
            },
            Chords = new List<Chord>
            {
                new() { Name = "C", Instrument = defaultInstrument, Diagram = "x,3,2,0,1,0", BaseFret = 1 },
                new() { Name = "G", Instrument = defaultInstrument, Diagram = "3,2,0,0,0,3", BaseFret = 1 },
                new() { Name = "Am", Instrument = defaultInstrument, Diagram = "x,0,2,2,1,0", BaseFret = 1 },
                new() { Name = "F", Instrument = defaultInstrument, Diagram = "1,3,3,2,1,1", BaseFret = 1 }
            }
        };

        db.Songs.Add(newSong);
        await db.SaveChangesAsync();

        track.SongId = newSong.Id;

        var siblingTracks = await db.PlaylistTracks
            .Where(t => t.SongId == null &&
                        t.Title.ToLower() == track.Title.ToLower() &&
                        t.Artist.ToLower() == track.Artist.ToLower())
            .ToListAsync();

        foreach (var sibling in siblingTracks)
        {
            sibling.SongId = newSong.Id;
        }

        await db.SaveChangesAsync();

        return (newSong, true);
    }

    private static async Task<object?> FetchPlaylistDtoAsync(int playlistId, AppDbContext db)
    {
        var p = await db.Playlists
            .AsNoTracking()
            .Include(x => x.Tracks)
            .ThenInclude(t => t.Votes)
            .ThenInclude(v => v.Voter)
            .FirstOrDefaultAsync(x => x.Id == playlistId);

        if (p is null) return null;

        var tracks = p.Tracks
            .OrderByDescending(t => t.Votes.Count)
            .ThenBy(t => t.TrackOrder)
            .Select(t => new
            {
                t.Id,
                t.PlaylistId,
                t.SpotifyTrackId,
                t.SpotifyTrackUri,
                t.Title,
                t.Artist,
                t.DurationMs,
                t.PreviewUrl,
                t.TrackOrder,
                t.SongId,
                VotesCount = t.Votes.Count,
                Voters = t.Votes
                    .OrderBy(v => v.CreatedAt)
                    .Select(v => v.Voter != null ? v.Voter.Name : string.Empty)
                    .Where(name => !string.IsNullOrEmpty(name))
                    .ToList()
            })
            .ToList();

        return new
        {
            p.Id,
            p.SpotifyPlaylistId,
            p.SpotifyUrl,
            p.Name,
            p.OwnerName,
            p.CoverImageUrl,
            p.IsCustomCreated,
            p.SourcePlaylistId,
            ProfileName = string.IsNullOrEmpty(p.ProfileName) ? p.OwnerName : p.ProfileName,
            p.ExternalUserId,
            p.ExternalProfileId,
            p.OrganizationName,
            p.Description,
            p.IsSharedOnHome,
            p.VotingEnabled,
            p.CreatedAt,
            TracksCount = tracks.Count,
            ImportedSongsCount = tracks.Count(t => t.SongId != null),
            TotalVotes = tracks.Sum(t => t.VotesCount),
            Tracks = tracks
        };
    }

    private static async Task<(Playlist? Playlist, string? Error)> ImportSpotifyPlaylistInternalAsync(
        string playlistUrlOrId,
        string? profileName,
        string? externalUserId,
        int? externalProfileId,
        string? organizationName,
        bool isSharedOnHome,
        bool votingEnabled,
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache)
    {
        var spotifyId = ExtractSpotifyPlaylistId(playlistUrlOrId);
        if (string.IsNullOrWhiteSpace(spotifyId))
        {
            return (null, "Link de playlist do Spotify inválido. Exemplo válido: https://open.spotify.com/playlist/6q8HxGekCdXiI87fJzxWR4");
        }

        var existing = await db.Playlists
            .Include(p => p.Tracks)
            .FirstOrDefaultAsync(p => p.SpotifyPlaylistId == spotifyId && !p.IsCustomCreated);

        var cacheKey = $"spotify_embed_json_{spotifyId}";
        if (!cache.TryGetValue<string>(cacheKey, out var cachedJson) || string.IsNullOrWhiteSpace(cachedJson))
        {
            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");

            var embedUrl = $"https://open.spotify.com/embed/playlist/{spotifyId}";
            HttpResponseMessage response;
            try
            {
                response = await client.GetAsync(embedUrl);
            }
            catch (Exception ex)
            {
                return (null, $"Erro de conexão ao consultar o Spotify: {ex.Message}");
            }

            if (!response.IsSuccessStatusCode)
            {
                return (null, $"Não foi possível carregar a playlist do Spotify (Status {(int)response.StatusCode}). Verifique se a playlist é pública.");
            }

            var html = await response.Content.ReadAsStringAsync();
            var match = Regex.Match(html, @"<script id=""__NEXT_DATA__"" type=""application/json"">([^<]+)</script>");
            if (!match.Success)
            {
                return (null, "Não foi possível extrair os dados da playlist pública do Spotify.");
            }

            cachedJson = match.Groups[1].Value;
            cache.Set(cacheKey, cachedJson, TimeSpan.FromMinutes(5));
        }

        using var doc = JsonDocument.Parse(cachedJson);
        if (!doc.RootElement.TryGetProperty("props", out var props) ||
            !props.TryGetProperty("pageProps", out var pageProps) ||
            !pageProps.TryGetProperty("state", out var state) ||
            !state.TryGetProperty("data", out var data) ||
            !data.TryGetProperty("entity", out var entity))
        {
            return (null, "Estrutura da playlist do Spotify não reconhecida.");
        }

        var name = entity.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "Playlist Spotify" : "Playlist Spotify";
        var owner = entity.TryGetProperty("subtitle", out var subProp) ? NormalizeName(subProp.GetString()) : "Spotify";

        var cleanProfile = NormalizeName(profileName);
        if (!string.IsNullOrWhiteSpace(cleanProfile))
        {
            await EnsurePersonRegisteredAsync(cleanProfile, db);
        }
        else if (!string.IsNullOrWhiteSpace(owner) && owner != "Spotify")
        {
            await EnsurePersonRegisteredAsync(owner, db);
        }

        string? coverUrl = null;
        if (entity.TryGetProperty("coverArt", out var coverArt) &&
            coverArt.TryGetProperty("sources", out var sources) &&
            sources.ValueKind == JsonValueKind.Array &&
            sources.GetArrayLength() > 0)
        {
            coverUrl = sources[0].TryGetProperty("url", out var urlProp) ? urlProp.GetString() : null;
        }

        if (!entity.TryGetProperty("trackList", out var trackList) || trackList.ValueKind != JsonValueKind.Array)
        {
            return (null, "A playlist do Spotify não possui faixas visíveis.");
        }

        if (existing is not null)
        {
            existing.Name = name;
            existing.OwnerName = owner;
            existing.CoverImageUrl = coverUrl ?? existing.CoverImageUrl;
            if (!string.IsNullOrWhiteSpace(cleanProfile))
            {
                existing.ProfileName = cleanProfile;
            }
            else if (string.IsNullOrWhiteSpace(existing.ProfileName))
            {
                existing.ProfileName = owner;
            }

            if (!string.IsNullOrWhiteSpace(externalUserId)) existing.ExternalUserId = externalUserId;
            if (externalProfileId.HasValue) existing.ExternalProfileId = externalProfileId;
            if (!string.IsNullOrWhiteSpace(organizationName)) existing.OrganizationName = organizationName;

            var existingTrackIds = existing.Tracks.Select(t => t.SpotifyTrackId).ToHashSet();
            int nextOrder = existing.Tracks.Count > 0 ? existing.Tracks.Max(t => t.TrackOrder) + 1 : 1;

            foreach (var item in trackList.EnumerateArray())
            {
                var uri = item.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() ?? "" : "";
                var trackSpotifyId = uri.StartsWith("spotify:track:") ? uri.Replace("spotify:track:", "") : uri;
                if (string.IsNullOrWhiteSpace(trackSpotifyId) || existingTrackIds.Contains(trackSpotifyId))
                {
                    continue;
                }

                var title = NormalizeName(item.TryGetProperty("title", out var tProp) ? tProp.GetString() : "Faixa");
                var artist = NormalizeName(item.TryGetProperty("subtitle", out var aProp) ? aProp.GetString() : "Artista");
                var duration = item.TryGetProperty("duration", out var dProp) && dProp.TryGetInt32(out var ms) ? ms : 0;

                string? preview = null;
                if (item.TryGetProperty("audioPreview", out var ap) &&
                    ap.ValueKind == JsonValueKind.Object &&
                    ap.TryGetProperty("url", out var pUrl))
                {
                    preview = pUrl.GetString();
                }

                existing.Tracks.Add(new PlaylistTrack
                {
                    SpotifyTrackUri = uri,
                    SpotifyTrackId = trackSpotifyId,
                    Title = title,
                    Artist = artist,
                    DurationMs = duration,
                    PreviewUrl = preview,
                    TrackOrder = nextOrder++
                });
                existingTrackIds.Add(trackSpotifyId);
            }

            await db.SaveChangesAsync();
            return (existing, null);
        }

        var playlist = new Playlist
        {
            SpotifyPlaylistId = spotifyId,
            SpotifyUrl = $"https://open.spotify.com/playlist/{spotifyId}",
            Name = name,
            OwnerName = owner,
            ProfileName = !string.IsNullOrWhiteSpace(cleanProfile) ? cleanProfile : owner,
            ExternalUserId = externalUserId,
            ExternalProfileId = externalProfileId,
            OrganizationName = organizationName,
            IsSharedOnHome = isSharedOnHome,
            VotingEnabled = votingEnabled,
            CoverImageUrl = coverUrl,
            IsCustomCreated = false,
            CreatedAt = DateTime.UtcNow
        };

        int order = 1;
        foreach (var item in trackList.EnumerateArray())
        {
            var uri = item.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() ?? "" : "";
            var trackSpotifyId = uri.StartsWith("spotify:track:") ? uri.Replace("spotify:track:", "") : uri;

            var title = NormalizeName(item.TryGetProperty("title", out var tProp) ? tProp.GetString() : "Faixa");
            var artist = NormalizeName(item.TryGetProperty("subtitle", out var aProp) ? aProp.GetString() : "Artista");
            var duration = item.TryGetProperty("duration", out var dProp) && dProp.TryGetInt32(out var ms) ? ms : 0;

            string? preview = null;
            if (item.TryGetProperty("audioPreview", out var ap) &&
                ap.ValueKind == JsonValueKind.Object &&
                ap.TryGetProperty("url", out var pUrl))
            {
                preview = pUrl.GetString();
            }

            playlist.Tracks.Add(new PlaylistTrack
            {
                SpotifyTrackUri = uri,
                SpotifyTrackId = trackSpotifyId,
                Title = title,
                Artist = artist,
                DurationMs = duration,
                PreviewUrl = preview,
                TrackOrder = order++
            });
        }

        db.Playlists.Add(playlist);
        await db.SaveChangesAsync();

        return (playlist, null);
    }

    private static async Task<(bool Success, string PlaylistId, string PlaylistUrl, string? ErrorMessage)> TryCreateSpotifyRemotePlaylistAsync(
        string accessToken,
        string playlistName,
        List<string> trackUris,
        IHttpClientFactory httpClientFactory)
    {
        try
        {
            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var createPayload = JsonSerializer.Serialize(new
            {
                name = playlistName,
                description = "Playlist criada pelo Cifra Trans",
                @public = true
            });

            var createResp = await client.PostAsync(
                "https://api.spotify.com/v1/me/playlists",
                new StringContent(createPayload, Encoding.UTF8, "application/json"));

            if (!createResp.IsSuccessStatusCode)
            {
                return (false, string.Empty, string.Empty, $"Token do Spotify recusado ({(int)createResp.StatusCode}). A playlist foi criada localmente no Cifra Trans.");
            }

            using var createDoc = JsonDocument.Parse(await createResp.Content.ReadAsStringAsync());
            var newPlaylistId = createDoc.RootElement.GetProperty("id").GetString() ?? string.Empty;
            var externalUrl = createDoc.RootElement.TryGetProperty("external_urls", out var ext) &&
                              ext.TryGetProperty("spotify", out var spUrl)
                ? spUrl.GetString() ?? $"https://open.spotify.com/playlist/{newPlaylistId}"
                : $"https://open.spotify.com/playlist/{newPlaylistId}";

            if (trackUris.Count > 0 && !string.IsNullOrWhiteSpace(newPlaylistId))
            {
                var addTracksPayload = JsonSerializer.Serialize(new { uris = trackUris.Take(100).ToList() });
                await client.PostAsync(
                    $"https://api.spotify.com/v1/playlists/{newPlaylistId}/tracks",
                    new StringContent(addTracksPayload, Encoding.UTF8, "application/json"));
            }

            return (true, newPlaylistId, externalUrl, null);
        }
        catch (Exception ex)
        {
            return (false, string.Empty, string.Empty, $"Falha ao comunicar com a API do Spotify: {ex.Message}");
        }
    }

    private static string ExtractSpotifyPlaylistId(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var trimmed = input.Trim();

        var urlMatch = Regex.Match(trimmed, @"playlist/([a-zA-Z0-9]{15,30})");
        if (urlMatch.Success) return urlMatch.Groups[1].Value;

        var uriMatch = Regex.Match(trimmed, @"spotify:playlist:([a-zA-Z0-9]{15,30})");
        if (uriMatch.Success) return uriMatch.Groups[1].Value;

        if (Regex.IsMatch(trimmed, @"^[a-zA-Z0-9]{15,30}$"))
        {
            return trimmed;
        }

        return string.Empty;
    }

    private static string NormalizeName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return Regex.Replace(value.Replace('\u00A0', ' ').Trim(), @"\s+", " ");
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
