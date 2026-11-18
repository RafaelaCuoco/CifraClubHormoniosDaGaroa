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
    public DbSet<Playlist> Playlists => Set<Playlist>();
    public DbSet<PlaylistTrack> PlaylistTracks => Set<PlaylistTrack>();
    public DbSet<Voter> Voters => Set<Voter>();
    public DbSet<PlaylistVote> PlaylistVotes => Set<PlaylistVote>();
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();

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
            entity.Property(s => s.CreatorUserId).HasMaxLength(100);
            entity.Property(s => s.CreatorName).HasMaxLength(150);

            entity.HasIndex(s => new { s.IsPublic, s.CreatedAt });
            entity.HasIndex(s => s.CreatorUserId);

            entity.HasMany(s => s.Tracks)
                  .WithOne(t => t.Song)
                  .HasForeignKey(t => t.SongId)
                  .OnDelete(DeleteBehavior.Cascade);

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

        // Configuração de Playlist
        modelBuilder.Entity<Playlist>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(250);
            entity.Property(p => p.SpotifyPlaylistId).HasMaxLength(100);
            entity.Property(p => p.SpotifyUrl).HasMaxLength(500);
            entity.Property(p => p.OwnerName).HasMaxLength(200);
            entity.Property(p => p.CoverImageUrl).HasMaxLength(1000);
            entity.Property(p => p.ProfileName).HasMaxLength(150);
            entity.Property(p => p.ExternalUserId).HasMaxLength(100);
            entity.Property(p => p.OrganizationName).HasMaxLength(200);
            entity.Property(p => p.Description).HasMaxLength(500);

            entity.HasIndex(p => new { p.IsSharedOnHome, p.ExternalProfileId, p.CreatedAt });
            entity.HasIndex(p => p.ExternalUserId);

            entity.HasMany(p => p.Tracks)
                  .WithOne(t => t.Playlist)
                  .HasForeignKey(t => t.PlaylistId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuração de PlaylistTrack
        modelBuilder.Entity<PlaylistTrack>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Title).IsRequired().HasMaxLength(300);
            entity.Property(t => t.Artist).IsRequired().HasMaxLength(300);
            entity.Property(t => t.SpotifyTrackUri).HasMaxLength(150);
            entity.Property(t => t.SpotifyTrackId).HasMaxLength(100);
            entity.Property(t => t.PreviewUrl).HasMaxLength(1000);

            entity.HasIndex(t => new { t.PlaylistId, t.TrackOrder });
            entity.HasIndex(t => t.SongId);

            entity.HasMany(t => t.Votes)
                  .WithOne(v => v.PlaylistTrack)
                  .HasForeignKey(v => v.PlaylistTrackId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuração de Voter
        modelBuilder.Entity<Voter>(entity =>
        {
            entity.HasKey(v => v.Id);
            entity.Property(v => v.Name).IsRequired().HasMaxLength(150);
            entity.HasIndex(v => v.Name).IsUnique();

            entity.HasMany(v => v.Votes)
                  .WithOne(pv => pv.Voter)
                  .HasForeignKey(pv => pv.VoterId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuração de PlaylistVote
        modelBuilder.Entity<PlaylistVote>(entity =>
        {
            entity.HasKey(pv => pv.Id);
            entity.HasIndex(pv => new { pv.PlaylistTrackId, pv.VoterId }).IsUnique();
        });

        // Configuração de UserAccount
        modelBuilder.Entity<UserAccount>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.UserId).IsRequired().HasMaxLength(100);
            entity.Property(u => u.Username).IsRequired().HasMaxLength(100);
            entity.Property(u => u.Name).IsRequired().HasMaxLength(200);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(200);
            entity.Property(u => u.Phone).HasMaxLength(50);
            entity.Property(u => u.OrganizationName).HasMaxLength(200);
            entity.Property(u => u.PasswordHash).IsRequired().HasMaxLength(250);
            entity.Property(u => u.Role).HasMaxLength(50);
            entity.Property(u => u.Status).HasMaxLength(50);
            entity.Property(u => u.ValidationCode).HasMaxLength(20);
            entity.Property(u => u.InviteToken).HasMaxLength(1000);
            entity.HasIndex(u => u.Username).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
        });
    }
}
