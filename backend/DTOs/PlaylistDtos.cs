namespace CifraTrans.Api.DTOs;

public record TransicionaisLoginDto(
    string? Username = null,
    string? Password = null,
    string? CustomId = null,
    string? SelectionToken = null,
    string? DisplayName = null
);

public record TransicionaisRegisterDto(
    string Name,
    string Username,
    string Email,
    string Password,
    string ConfirmPassword,
    string? Phone = null,
    string? CustomId = null,
    string? InviteToken = null,
    string? InviteCode = null
);

public record ValidateRegistrationDto(
    string UsernameOrEmail,
    string Code,
    string? InviteToken = null,
    string? Password = null
);

public record TransicionaisOAuthAuthorizeDto(
    string Provider = "google",
    string RedirectUri = "http://localhost:4256",
    string State = "",
    string CodeChallenge = ""
);

public record TransicionaisOAuthExchangeDto(
    string Provider = "google",
    string Code = "",
    string CodeVerifier = "",
    string RedirectUri = "http://localhost:4256",
    string? CustomId = null
);

public record TransicionaisRefreshDto(string RefreshToken);

public record ImportPlaylistDto(
    string PlaylistUrl,
    string? ProfileName = null,
    string? ExternalUserId = null,
    int? ExternalProfileId = null,
    string? OrganizationName = null,
    bool IsSharedOnHome = true,
    bool VotingEnabled = false
);

public record UpdatePlaylistSettingsDto(
    string? Name = null,
    string? ProfileName = null,
    string? ExternalUserId = null,
    int? ExternalProfileId = null,
    string? OrganizationName = null,
    string? Description = null,
    bool? IsSharedOnHome = null,
    bool? VotingEnabled = null
);

public record CreateVoterDto(string Name);

public record VoteTrackDto(string VoterName);

public record GeneratePlaylistDto(
    string Name,
    int MinVotes = 1,
    int? TopLimit = null,
    List<int>? SelectedTrackIds = null,
    string? SpotifyAccessToken = null,
    string? ProfileName = null,
    string? ExternalUserId = null,
    int? ExternalProfileId = null,
    string? OrganizationName = null,
    string? Description = null,
    bool IsSharedOnHome = true,
    bool VotingEnabled = false,
    bool ImportToSongs = false
);

public record ImportTracksToSongsDto(
    bool OnlyVoted = false,
    List<int>? TrackIds = null,
    string DefaultInstrument = "Violão",
    string DefaultKey = "C",
    bool IsPublic = true,
    string? CreatorUserId = null,
    string? CreatorName = null
);
