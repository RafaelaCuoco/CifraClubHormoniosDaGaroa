using CifraTrans.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CifraTrans.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Song> Songs => Set<Song>();
    public DbSet<InstrumentTrack> InstrumentTracks => Set<InstrumentTrack>();
    public DbSet<Chord> Chords => Set<Chord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configuração de Song
        modelBuilder.Entity<Song>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Title).IsRequired().HasMaxLength(200);
            entity.Property(s => s.Artist).IsRequired().HasMaxLength(200);
            entity.Property(s => s.OriginalKey).IsRequired().HasMaxLength(10);

            // Relacionamento 1:N com InstrumentTrack
            entity.HasMany(s => s.Tracks)
                  .WithOne(t => t.Song)
                  .HasForeignKey(t => t.SongId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relacionamento 1:N com Chord
            entity.HasMany(s => s.Chords)
                  .WithOne(c => c.Song)
                  .HasForeignKey(c => c.SongId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuração de InstrumentTrack
        modelBuilder.Entity<InstrumentTrack>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Instrument).IsRequired().HasMaxLength(100);
            entity.Property(t => t.Content).IsRequired();
            entity.Property(t => t.Difficulty).HasMaxLength(50);
            entity.Property(t => t.Tuning).HasMaxLength(100);
        });

        // Configuração de Chord
        modelBuilder.Entity<Chord>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).IsRequired().HasMaxLength(50);
            entity.Property(c => c.Instrument).IsRequired().HasMaxLength(100);
            entity.Property(c => c.Diagram).HasMaxLength(200);
        });
    }
}
