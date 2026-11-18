namespace CifraTrans.Api.Models;

public class UserAccount
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string OrganizationName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "user";

    // PENDING_VALIDATION ou ACTIVE
    public string Status { get; set; } = "PENDING_VALIDATION";
    public string ValidationCode { get; set; } = string.Empty;
    public string? InviteToken { get; set; }
    public int? ExternalProfileId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ValidatedAt { get; set; }
}
