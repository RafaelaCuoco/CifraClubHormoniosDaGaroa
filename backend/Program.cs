using System.Text.Json.Serialization;
using CifraTrans.Api.Data;
using CifraTrans.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Configuração do DbContext com PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

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

app.UseCors("AllowFrontend");

// Endpoints da API
app.MapGet("/", () => Results.Ok(new
{
    name = "Cifra Trans API",
    version = "1.0 (.NET 10 Minimal APIs)",
    status = "Online"
}));

// Mapeia os endpoints de músicas em /api/songs
app.MapSongEndpoints();

app.Run();
