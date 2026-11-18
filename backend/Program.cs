using System.Text.Json.Serialization;
using CifraTrans.Api.Data;
using CifraTrans.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Configuração do DbContext com PostgreSQL e SplitQuery para evitar MultipleCollectionIncludeWarning (EF 20504)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptions => npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)
    ));

// Cache em memória nativo para resiliência de chamadas externas (Spotify Embed e Perfil Transicionais)
builder.Services.AddMemoryCache();

// HttpClient com timeout resiliente para buscar playlists públicas e comunicar com a API do Spotify e Transicionais
builder.Services.AddHttpClient(Microsoft.Extensions.Options.Options.DefaultName, client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
});

// Configuração do Serializer JSON para ignorar ciclos de referência nos relacionamentos do EF Core
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

// Configuração de CORS para permitir requisições do frontend Angular e do tunnel
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:4256",
            "http://localhost:4200",
            "https://cifratrans.rafaelacuoco.com.br",
            "http://cifratrans.rafaelacuoco.com.br"
        )
        .SetIsOriginAllowed(origin => 
            string.IsNullOrEmpty(origin) || 
            origin.Contains("localhost") || 
            origin.EndsWith("rafaelacuoco.com.br", StringComparison.OrdinalIgnoreCase))
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

var app = builder.Build();

// Garante a criação e atualização das tabelas de Songs, Playlists, Perfis e UserAccounts no PostgreSQL de forma idempotente
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    await db.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE ""Songs"" ADD COLUMN IF NOT EXISTS ""CreatorUserId"" VARCHAR(100) NULL;
        ALTER TABLE ""Songs"" ADD COLUMN IF NOT EXISTS ""CreatorName"" VARCHAR(150) NULL;
        ALTER TABLE ""Songs"" ADD COLUMN IF NOT EXISTS ""IsPublic"" BOOLEAN NOT NULL DEFAULT TRUE;

        CREATE TABLE IF NOT EXISTS ""UserAccounts"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""UserId"" VARCHAR(100) NOT NULL,
            ""Username"" VARCHAR(100) NOT NULL UNIQUE,
            ""Name"" VARCHAR(200) NOT NULL,
            ""Email"" VARCHAR(200) NOT NULL UNIQUE,
            ""Phone"" VARCHAR(50) NOT NULL DEFAULT '',
            ""OrganizationName"" VARCHAR(200) NOT NULL DEFAULT '',
            ""PasswordHash"" VARCHAR(250) NOT NULL,
            ""Role"" VARCHAR(50) NOT NULL DEFAULT 'user',
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'PENDING_VALIDATION',
            ""ValidationCode"" VARCHAR(20) NOT NULL DEFAULT '',
            ""InviteToken"" VARCHAR(1000) NULL,
            ""ExternalProfileId"" INTEGER NULL,
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            ""ValidatedAt"" TIMESTAMP WITH TIME ZONE NULL
        );

        CREATE TABLE IF NOT EXISTS ""Playlists"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""SpotifyPlaylistId"" VARCHAR(100) NOT NULL DEFAULT '',
            ""SpotifyUrl"" VARCHAR(500) NOT NULL DEFAULT '',
            ""Name"" VARCHAR(250) NOT NULL,
            ""OwnerName"" VARCHAR(200) NOT NULL DEFAULT '',
            ""CoverImageUrl"" VARCHAR(1000) NULL,
            ""IsCustomCreated"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""SourcePlaylistId"" INTEGER NULL,
            ""ProfileName"" VARCHAR(150) NOT NULL DEFAULT '',
            ""ExternalUserId"" VARCHAR(100) NULL,
            ""ExternalProfileId"" INTEGER NULL,
            ""OrganizationName"" VARCHAR(200) NULL,
            ""Description"" VARCHAR(500) NULL,
            ""IsSharedOnHome"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""VotingEnabled"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );

        ALTER TABLE ""Playlists"" ADD COLUMN IF NOT EXISTS ""ProfileName"" VARCHAR(150) NOT NULL DEFAULT '';
        ALTER TABLE ""Playlists"" ADD COLUMN IF NOT EXISTS ""ExternalUserId"" VARCHAR(100) NULL;
        ALTER TABLE ""Playlists"" ADD COLUMN IF NOT EXISTS ""ExternalProfileId"" INTEGER NULL;
        ALTER TABLE ""Playlists"" ADD COLUMN IF NOT EXISTS ""OrganizationName"" VARCHAR(200) NULL;
        ALTER TABLE ""Playlists"" ADD COLUMN IF NOT EXISTS ""Description"" VARCHAR(500) NULL;
        ALTER TABLE ""Playlists"" ADD COLUMN IF NOT EXISTS ""IsSharedOnHome"" BOOLEAN NOT NULL DEFAULT TRUE;
        ALTER TABLE ""Playlists"" ADD COLUMN IF NOT EXISTS ""VotingEnabled"" BOOLEAN NOT NULL DEFAULT FALSE;

        CREATE TABLE IF NOT EXISTS ""PlaylistTracks"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""PlaylistId"" INTEGER NOT NULL REFERENCES ""Playlists""(""Id"") ON DELETE CASCADE,
            ""SpotifyTrackUri"" VARCHAR(150) NOT NULL DEFAULT '',
            ""SpotifyTrackId"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Title"" VARCHAR(300) NOT NULL,
            ""Artist"" VARCHAR(300) NOT NULL,
            ""DurationMs"" INTEGER NOT NULL DEFAULT 0,
            ""PreviewUrl"" VARCHAR(1000) NULL,
            ""TrackOrder"" INTEGER NOT NULL DEFAULT 0,
            ""SongId"" INTEGER NULL
        );

        ALTER TABLE ""PlaylistTracks"" ADD COLUMN IF NOT EXISTS ""SongId"" INTEGER NULL;

        CREATE TABLE IF NOT EXISTS ""Voters"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""Name"" VARCHAR(150) NOT NULL UNIQUE,
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""PlaylistVotes"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""PlaylistTrackId"" INTEGER NOT NULL REFERENCES ""PlaylistTracks""(""Id"") ON DELETE CASCADE,
            ""VoterId"" INTEGER NOT NULL REFERENCES ""Voters""(""Id"") ON DELETE CASCADE,
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT ""IX_PlaylistVotes_PlaylistTrackId_VoterId"" UNIQUE (""PlaylistTrackId"", ""VoterId"")
        );

        CREATE INDEX IF NOT EXISTS ""IX_Songs_IsPublic_CreatedAt"" ON ""Songs"" (""IsPublic"", ""CreatedAt"" DESC);
        CREATE INDEX IF NOT EXISTS ""IX_Songs_CreatorUserId"" ON ""Songs"" (""CreatorUserId"");
        CREATE INDEX IF NOT EXISTS ""IX_Playlists_IsSharedOnHome_ExternalProfileId_CreatedAt"" ON ""Playlists"" (""IsSharedOnHome"", ""ExternalProfileId"", ""CreatedAt"" DESC);
        CREATE INDEX IF NOT EXISTS ""IX_Playlists_ExternalUserId"" ON ""Playlists"" (""ExternalUserId"");
        CREATE INDEX IF NOT EXISTS ""IX_PlaylistTracks_PlaylistId_TrackOrder"" ON ""PlaylistTracks"" (""PlaylistId"", ""TrackOrder"");
        CREATE INDEX IF NOT EXISTS ""IX_PlaylistTracks_SongId"" ON ""PlaylistTracks"" (""SongId"");
    ");
}

app.UseCors("AllowFrontend");

// Endpoints da API
app.MapGet("/", () => Results.Ok(new
{
    name = "Cifra Trans API",
    version = "1.5 (.NET 10 Minimal APIs + Cadastro & Aguardo de Validação + Visibilidade Pública/Privada)",
    status = "Online"
}));

// Mapeia os endpoints de músicas em /api/songs
app.MapSongEndpoints();

// Mapeia os endpoints de playlists, perfis e votação em /api/playlists e /api/voters
app.MapPlaylistEndpoints();

// Mapeia os endpoints de autenticação e cadastro via API Transicionais em /api/auth/transicionais
app.MapTransicionaisAuthEndpoints();

app.Run();
