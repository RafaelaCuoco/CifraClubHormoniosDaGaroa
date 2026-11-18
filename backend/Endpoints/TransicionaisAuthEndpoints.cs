using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
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

public static class TransicionaisAuthEndpoints
{
    private const string TransicionaisBaseUrl = "https://api.transicionais.com.br";

    public static WebApplication MapTransicionaisAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth/transicionais");
        MapRoutes(group);
        return app;
    }

    private static void MapRoutes(RouteGroupBuilder group)
    {
        // POST /api/auth/transicionais/register
        // Cria uma solicitação de cadastro (ou confirma convite Transicionais) e coloca em Aguardo de Validação
        group.MapPost("/register", async (TransicionaisRegisterDto dto, AppDbContext db, IHttpClientFactory httpClientFactory) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Name) ||
                string.IsNullOrWhiteSpace(dto.Username) ||
                string.IsNullOrWhiteSpace(dto.Email) ||
                string.IsNullOrWhiteSpace(dto.Password))
            {
                return Results.BadRequest(new { message = "Nome, Usuário, E-mail e Senha são obrigatórios." });
            }

            if (dto.Password != dto.ConfirmPassword)
            {
                return Results.BadRequest(new { message = "A confirmação de senha não confere." });
            }

            var cleanUsername = dto.Username.Trim().ToLower();
            var cleanEmail = dto.Email.Trim().ToLower();
            var cleanName = NormalizeName(dto.Name);

            var existingAccount = await db.UserAccounts
                .FirstOrDefaultAsync(u => u.Username.ToLower() == cleanUsername || u.Email.ToLower() == cleanEmail);

            if (existingAccount is not null)
            {
                if (existingAccount.Status == "PENDING_VALIDATION")
                {
                    return Results.Ok(new
                    {
                        requiresValidation = true,
                        status = "PENDING_VALIDATION",
                        username = existingAccount.Username,
                        email = existingAccount.Email,
                        name = existingAccount.Name,
                        validationCode = existingAccount.ValidationCode,
                        message = "Este login já foi solicitado e está aguardando validação."
                    });
                }

                return Results.Conflict(new { message = "Este usuário ou e-mail já possui cadastro ativo." });
            }

            bool confirmedExternally = false;
            if (!string.IsNullOrWhiteSpace(dto.InviteToken) && !string.IsNullOrWhiteSpace(dto.InviteCode))
            {
                var client = httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", dto.InviteToken.Trim());
                var confirmPayload = new
                {
                    email = cleanEmail,
                    password = dto.Password,
                    confirmPassowrd = dto.ConfirmPassword,
                    code = dto.InviteCode.Trim()
                };

                try
                {
                    var resp = await client.PostAsync(
                        $"{TransicionaisBaseUrl}/apps_nodejs/auth/invite/confirm",
                        new StringContent(JsonSerializer.Serialize(confirmPayload), Encoding.UTF8, "application/json"));

                    if (resp.IsSuccessStatusCode)
                    {
                        confirmedExternally = true;
                    }
                }
                catch { }
            }

            var code = string.IsNullOrWhiteSpace(dto.InviteCode)
                ? Random.Shared.Next(100000, 999999).ToString()
                : dto.InviteCode.Trim();

            var newAccount = new UserAccount
            {
                UserId = $"usr-{Guid.NewGuid():N}",
                Username = cleanUsername,
                Name = cleanName,
                Email = cleanEmail,
                Phone = dto.Phone?.Trim() ?? "",
                OrganizationName = string.IsNullOrWhiteSpace(dto.CustomId) ? "Hormônios da Garoa" : dto.CustomId.Trim(),
                PasswordHash = HashPassword(dto.Password),
                Role = "user",
                Status = confirmedExternally ? "ACTIVE" : "PENDING_VALIDATION",
                ValidationCode = code,
                InviteToken = dto.InviteToken?.Trim(),
                CreatedAt = DateTime.UtcNow,
                ValidatedAt = confirmedExternally ? DateTime.UtcNow : null
            };

            db.UserAccounts.Add(newAccount);
            await db.SaveChangesAsync();

            if (confirmedExternally)
            {
                await EnsureVoterExistsAsync(cleanName, db);
            }

            return Results.Ok(new
            {
                requiresValidation = !confirmedExternally,
                status = newAccount.Status,
                username = newAccount.Username,
                email = newAccount.Email,
                name = newAccount.Name,
                organizationName = newAccount.OrganizationName,
                validationCode = newAccount.ValidationCode,
                message = confirmedExternally
                    ? "Convite confirmado e login ativado com sucesso!"
                    : "Cadastro criado! Sua conta está em aguardo de validação de login."
            });
        });

        // GET /api/auth/transicionais/registration-status
        // Consulta o status de aguardo de validação (e checa /apps_nodejs/auth/invite/check se houver inviteToken)
        group.MapGet("/registration-status", async (string? usernameOrEmail, string? inviteToken, AppDbContext db, IHttpClientFactory httpClientFactory) =>
        {
            if (!string.IsNullOrWhiteSpace(inviteToken))
            {
                try
                {
                    var client = httpClientFactory.CreateClient();
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", inviteToken.Trim());
                    var checkResp = await client.GetAsync($"{TransicionaisBaseUrl}/apps_nodejs/auth/invite/check");
                    if (checkResp.IsSuccessStatusCode)
                    {
                        var body = await checkResp.Content.ReadAsStringAsync();
                        if (!string.IsNullOrWhiteSpace(body))
                        {
                            using var doc = JsonDocument.Parse(body);
                            var root = doc.RootElement;
                            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("code", out var codeProp))
                            {
                                return Results.Ok(new
                                {
                                    found = true,
                                    status = root.TryGetProperty("confirmedAt", out var conf) && conf.ValueKind != JsonValueKind.Null ? "ACTIVE" : "PENDING_VALIDATION",
                                    externalInviteCode = codeProp.GetString(),
                                    validAt = root.TryGetProperty("validAt", out var valAt) ? valAt.GetString() : null
                                });
                            }
                        }
                    }
                }
                catch { }
            }

            if (string.IsNullOrWhiteSpace(usernameOrEmail))
            {
                return Results.BadRequest(new { message = "Informe o usuário ou e-mail para consultar o status." });
            }

            var key = usernameOrEmail.Trim().ToLower();
            var acc = await db.UserAccounts
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Username.ToLower() == key || u.Email.ToLower() == key);

            if (acc is null)
            {
                return Results.NotFound(new { found = false, message = "Nenhuma solicitação encontrada para este usuário/e-mail." });
            }

            return Results.Ok(new
            {
                found = true,
                id = acc.Id,
                username = acc.Username,
                name = acc.Name,
                email = acc.Email,
                organizationName = acc.OrganizationName,
                status = acc.Status,
                validationCode = acc.ValidationCode,
                createdAt = acc.CreatedAt,
                validatedAt = acc.ValidatedAt
            });
        });

        // POST /api/auth/transicionais/validate-registration
        // Valida o código de 6 dígitos (local ou via /apps_nodejs/auth/invite/confirm) e libera o login imediatamente
        group.MapPost("/validate-registration", async (ValidateRegistrationDto dto, AppDbContext db, IHttpClientFactory httpClientFactory) =>
        {
            if (string.IsNullOrWhiteSpace(dto.UsernameOrEmail) || string.IsNullOrWhiteSpace(dto.Code))
            {
                return Results.BadRequest(new { message = "Informe o usuário/e-mail e o código de validação." });
            }

            var key = dto.UsernameOrEmail.Trim().ToLower();
            var acc = await db.UserAccounts
                .FirstOrDefaultAsync(u => u.Username.ToLower() == key || u.Email.ToLower() == key);

            if (acc is null)
            {
                return Results.NotFound(new { message = "Solicitação de cadastro não encontrada." });
            }

            // Se o usuário informou um token de convite do Transicionais, tenta confirmar também na API externa
            var tokenToUse = !string.IsNullOrWhiteSpace(dto.InviteToken) ? dto.InviteToken : acc.InviteToken;
            if (!string.IsNullOrWhiteSpace(tokenToUse) && !string.IsNullOrWhiteSpace(dto.Password))
            {
                try
                {
                    var client = httpClientFactory.CreateClient();
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenToUse.Trim());
                    var confirmPayload = new
                    {
                        email = acc.Email,
                        password = dto.Password,
                        confirmPassowrd = dto.Password,
                        code = dto.Code.Trim()
                    };
                    await client.PostAsync(
                        $"{TransicionaisBaseUrl}/apps_nodejs/auth/invite/confirm",
                        new StringContent(JsonSerializer.Serialize(confirmPayload), Encoding.UTF8, "application/json"));
                }
                catch { }
            }

            if (!string.Equals(acc.ValidationCode, dto.Code.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return Results.BadRequest(new { message = "Código de validação inválido." });
            }

            acc.Status = "ACTIVE";
            acc.ValidatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await EnsureVoterExistsAsync(acc.Name, db);

            return Results.Ok(new
            {
                requiresOrgSelection = false,
                token = $"active-{acc.UserId}-{Guid.NewGuid():N}",
                refresh = $"refresh-{acc.UserId}-{Guid.NewGuid():N}",
                userId = acc.UserId,
                profileId = acc.Id,
                username = acc.Username,
                displayName = acc.Name,
                email = acc.Email,
                role = acc.Role,
                organizationId = acc.OrganizationName,
                organizationName = acc.OrganizationName,
                groups = new[] { acc.OrganizationName },
                expiresAt = DateTimeOffset.UtcNow.AddDays(7).ToUnixTimeSeconds()
            });
        });

        // GET /api/auth/transicionais/pending-registrations
        // Lista cadastros aguardando validação para aprovação de administradores
        group.MapGet("/pending-registrations", async (AppDbContext db) =>
        {
            var list = await db.UserAccounts
                .AsNoTracking()
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    u.Id,
                    u.UserId,
                    u.Username,
                    u.Name,
                    u.Email,
                    u.Phone,
                    u.OrganizationName,
                    u.Status,
                    u.ValidationCode,
                    u.CreatedAt,
                    u.ValidatedAt
                })
                .ToListAsync();

            return Results.Ok(list);
        });

        // POST /api/auth/transicionais/approve-registration/{id:int}
        // Aprova diretamente um cadastro em aguardo de validação (e sincroniza com /apps_nodejs/v2/manager-profiles se houver token admin)
        group.MapPost("/approve-registration/{id:int}", async (int id, HttpRequest request, AppDbContext db, IHttpClientFactory httpClientFactory) =>
        {
            var acc = await db.UserAccounts.FindAsync(id);
            if (acc is null)
            {
                return Results.NotFound(new { message = "Cadastro não encontrado." });
            }

            var authHeader = request.Headers.Authorization.ToString();
            if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                if (!token.StartsWith("basic-docs-") && !token.StartsWith("active-"))
                {
                    try
                    {
                        var client = httpClientFactory.CreateClient();
                        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
                        var profileReq = new
                        {
                            name = acc.Name,
                            customId = $"CT-{acc.Id:D4}",
                            email = acc.Email,
                            phone = string.IsNullOrWhiteSpace(acc.Phone) ? "11999999999" : acc.Phone,
                            groupId = Array.Empty<int>()
                        };
                        var createResp = await client.PostAsync(
                            $"{TransicionaisBaseUrl}/apps_nodejs/v2/manager-profiles",
                            new StringContent(JsonSerializer.Serialize(profileReq), Encoding.UTF8, "application/json"));

                        if (createResp.IsSuccessStatusCode)
                        {
                            using var doc = JsonDocument.Parse(await createResp.Content.ReadAsStringAsync());
                            if (doc.RootElement.TryGetProperty("content", out var cProp) && cProp.TryGetInt32(out var extProfId))
                            {
                                acc.ExternalProfileId = extProfId;
                                var inviteReq = new { profileId = extProfId, role = "user" };
                                await client.PostAsync(
                                    $"{TransicionaisBaseUrl}/apps_nodejs/v2/auth/invite",
                                    new StringContent(JsonSerializer.Serialize(inviteReq), Encoding.UTF8, "application/json"));
                            }
                        }
                    }
                    catch { }
                }
            }

            acc.Status = "ACTIVE";
            acc.ValidatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await EnsureVoterExistsAsync(acc.Name, db);

            return Results.Ok(new
            {
                acc.Id,
                acc.Username,
                acc.Name,
                acc.Status,
                acc.ValidatedAt,
                message = $"Acesso de {acc.Name} ({acc.Username}) validado e liberado!"
            });
        });

        // POST /api/auth/transicionais/login
        group.MapPost("/login", async (TransicionaisLoginDto dto, AppDbContext db, IHttpClientFactory httpClientFactory, IMemoryCache cache) =>
        {
            var client = httpClientFactory.CreateClient();

            // 1. Verifica primeiro se é uma conta cadastrada na plataforma em aguardo de validação ou já ativa
            if (!string.IsNullOrWhiteSpace(dto.Username) && !string.IsNullOrWhiteSpace(dto.Password))
            {
                var key = dto.Username.Trim().ToLower();
                var localAcc = await db.UserAccounts
                    .FirstOrDefaultAsync(u => u.Username.ToLower() == key || u.Email.ToLower() == key);

                if (localAcc is not null && localAcc.PasswordHash == HashPassword(dto.Password))
                {
                    if (localAcc.Status == "PENDING_VALIDATION")
                    {
                        return Results.Ok(new
                        {
                            requiresValidation = true,
                            status = "PENDING_VALIDATION",
                            username = localAcc.Username,
                            email = localAcc.Email,
                            name = localAcc.Name,
                            organizationName = localAcc.OrganizationName,
                            validationCode = localAcc.ValidationCode,
                            message = "Seu cadastro foi localizado e está em aguardo de validação de login."
                        });
                    }

                    await EnsureVoterExistsAsync(localAcc.Name, db);
                    return Results.Ok(new
                    {
                        requiresOrgSelection = false,
                        requiresValidation = false,
                        token = $"active-{localAcc.UserId}-{Guid.NewGuid():N}",
                        refresh = $"refresh-{localAcc.UserId}-{Guid.NewGuid():N}",
                        userId = localAcc.UserId,
                        profileId = localAcc.Id,
                        username = localAcc.Username,
                        displayName = !string.IsNullOrWhiteSpace(dto.DisplayName) ? dto.DisplayName.Trim() : localAcc.Name,
                        email = localAcc.Email,
                        role = localAcc.Role,
                        organizationId = localAcc.OrganizationName,
                        organizationName = localAcc.OrganizationName,
                        groups = new[] { localAcc.OrganizationName },
                        expiresAt = DateTimeOffset.UtcNow.AddDays(7).ToUnixTimeSeconds()
                    });
                }
            }

            object payload;
            if (!string.IsNullOrWhiteSpace(dto.SelectionToken) && !string.IsNullOrWhiteSpace(dto.CustomId))
            {
                payload = new
                {
                    selectionToken = dto.SelectionToken.Trim(),
                    customId = dto.CustomId.Trim()
                };
            }
            else
            {
                if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
                {
                    return Results.BadRequest(new { message = "Informe o usuário/e-mail e a senha." });
                }

                if (!string.IsNullOrWhiteSpace(dto.CustomId))
                {
                    payload = new
                    {
                        username = dto.Username.Trim(),
                        password = dto.Password,
                        customId = dto.CustomId.Trim()
                    };
                }
                else
                {
                    payload = new
                    {
                        username = dto.Username.Trim(),
                        password = dto.Password
                    };
                }
            }

            HttpResponseMessage resp;
            try
            {
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                resp = await client.PostAsync($"{TransicionaisBaseUrl}/apps_nodejs/auth/login", content);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = $"Falha de conexão com api.transicionais.com.br: {ex.Message}" });
            }

            var bodyText = await resp.Content.ReadAsStringAsync();

            if (!resp.IsSuccessStatusCode)
            {
                if (!string.IsNullOrWhiteSpace(dto.Username) && !string.IsNullOrWhiteSpace(dto.Password))
                {
                    var basicVerified = await VerifyDocsBasicAuthAsync(dto.Username.Trim(), dto.Password, client);
                    if (basicVerified)
                    {
                        var customDisplayName = !string.IsNullOrWhiteSpace(dto.DisplayName)
                            ? dto.DisplayName.Trim()
                            : (dto.Username.Trim().Equals("docs", StringComparison.OrdinalIgnoreCase)
                                ? "Perfil Transicionais (docs)"
                                : dto.Username.Trim());

                        var orgName = !string.IsNullOrWhiteSpace(dto.CustomId)
                            ? dto.CustomId.Trim()
                            : "Transicionais API";

                        await EnsureVoterExistsAsync(customDisplayName, db);

                        return Results.Ok(new
                        {
                            requiresOrgSelection = false,
                            requiresValidation = false,
                            token = $"basic-docs-{Guid.NewGuid():N}",
                            refresh = $"refresh-docs-{Guid.NewGuid():N}",
                            userId = $"transicionais-{dto.Username.Trim().ToLower()}",
                            profileId = 1,
                            username = dto.Username.Trim(),
                            displayName = customDisplayName,
                            email = $"{dto.Username.Trim()}@transicionais.com.br",
                            role = "admin",
                            organizationId = orgName,
                            organizationName = orgName,
                            groups = new[] { "Hormônios da Garoa", "Transicionais" },
                            expiresAt = DateTimeOffset.UtcNow.AddDays(7).ToUnixTimeSeconds()
                        });
                    }
                }

                string errorMsg = "Usuário ou senha inválidos.";
                try
                {
                    using var errDoc = JsonDocument.Parse(bodyText);
                    if (errDoc.RootElement.TryGetProperty("message", out var msgProp) && msgProp.ValueKind == JsonValueKind.String)
                    {
                        errorMsg = msgProp.GetString() ?? errorMsg;
                    }
                }
                catch { }

                int statusToReturn = resp.StatusCode == HttpStatusCode.NotFound ? StatusCodes.Status401Unauthorized : (int)resp.StatusCode;
                return Results.Json(new
                {
                    key = "ACCOUNT_OR_PASSWORD_NOT_EXISTS",
                    message = $"{errorMsg} Caso ainda não tenha conta, clique na aba 'Criar Login / Cadastro'."
                }, statusCode: statusToReturn);
            }

            return await BuildSessionResponseFromJsonAsync(bodyText, dto.DisplayName, db, client, cache);
        });

        // POST /api/auth/transicionais/refresh
        group.MapPost("/refresh", async (TransicionaisRefreshDto dto, AppDbContext db, IHttpClientFactory httpClientFactory, IMemoryCache cache) =>
        {
            if (string.IsNullOrWhiteSpace(dto.RefreshToken))
            {
                return Results.BadRequest(new { message = "Refresh token obrigatório." });
            }

            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", dto.RefreshToken.Trim());

            HttpResponseMessage resp;
            try
            {
                resp = await client.PostAsync($"{TransicionaisBaseUrl}/apps_nodejs/auth/refresh-token", new StringContent("{}", Encoding.UTF8, "application/json"));
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = $"Erro ao renovar sessão Transicionais: {ex.Message}" });
            }

            if (!resp.IsSuccessStatusCode)
            {
                return Results.Unauthorized();
            }

            return await BuildSessionResponseFromJsonAsync(await resp.Content.ReadAsStringAsync(), null, db, client, cache);
        });

        // POST /api/auth/transicionais/logout
        group.MapPost("/logout", async (HttpRequest request, IHttpClientFactory httpClientFactory) =>
        {
            var authHeader = request.Headers.Authorization.ToString();
            if (!string.IsNullOrWhiteSpace(authHeader))
            {
                try
                {
                    var client = httpClientFactory.CreateClient();
                    client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", authHeader);
                    await client.PostAsync($"{TransicionaisBaseUrl}/apps_nodejs/auth/logout", null);
                }
                catch { }
            }

            return Results.NoContent();
        });

        // POST /api/auth/transicionais/sync-members
        group.MapPost("/sync-members", async (HttpRequest request, AppDbContext db, IHttpClientFactory httpClientFactory) =>
        {
            var authHeader = request.Headers.Authorization.ToString();
            if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                return Results.Unauthorized();
            }

            var token = authHeader.Substring("Bearer ".Length).Trim();
            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpResponseMessage resp;
            try
            {
                resp = await client.GetAsync($"{TransicionaisBaseUrl}/apps_nodejs/v2/manager-profiles?perPage=100");
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = $"Erro ao consultar perfis no Transicionais: {ex.Message}" });
            }

            int importedCount = 0;
            if (resp.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
                if (doc.RootElement.TryGetProperty("content", out var contentArr) && contentArr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in contentArr.EnumerateArray())
                    {
                        string? memberName = null;
                        if (item.TryGetProperty("profile", out var profObj) && profObj.ValueKind == JsonValueKind.Object)
                        {
                            memberName = profObj.TryGetProperty("name", out var nProp) ? nProp.GetString() : null;
                        }
                        else if (item.TryGetProperty("name", out var directName))
                        {
                            memberName = directName.GetString();
                        }

                        if (!string.IsNullOrWhiteSpace(memberName))
                        {
                            await EnsureVoterExistsAsync(memberName, db);
                            importedCount++;
                        }
                    }
                }
            }

            // Sincroniza também os usuários validados localmente
            var activeUsers = await db.UserAccounts
                .AsNoTracking()
                .Where(u => u.Status == "ACTIVE")
                .Select(u => u.Name)
                .ToListAsync();

            foreach (var uName in activeUsers)
            {
                await EnsureVoterExistsAsync(uName, db);
                importedCount++;
            }

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
                importedCount,
                voters = allVoters
            });
        });
    }

    private static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"cifratrans-salt::{password}"));
        return Convert.ToHexString(bytes);
    }

    private static string NormalizeName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return Regex.Replace(value.Replace('\u00A0', ' ').Trim(), @"\s+", " ");
    }

    private static async Task<bool> VerifyDocsBasicAuthAsync(string username, string password, HttpClient client)
    {
        try
        {
            var raw = $"{username}:{password}";
            var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{TransicionaisBaseUrl}/docs");
            req.Headers.Authorization = new AuthenticationHeaderValue("Basic", base64);
            var resp = await client.SendAsync(req);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private static async Task<IResult> BuildSessionResponseFromJsonAsync(
        string bodyText,
        string? customDisplayName,
        AppDbContext db,
        HttpClient client,
        IMemoryCache cache)
    {
        using var doc = JsonDocument.Parse(bodyText);
        var root = doc.RootElement;

        if (root.TryGetProperty("selectionToken", out var selTokenProp) &&
            root.TryGetProperty("organizations", out var orgsProp) &&
            orgsProp.ValueKind == JsonValueKind.Array)
        {
            var organizations = new List<object>();
            foreach (var org in orgsProp.EnumerateArray())
            {
                organizations.Add(new
                {
                    customId = org.TryGetProperty("customId", out var cId) ? cId.GetString() : "",
                    name = org.TryGetProperty("name", out var oName) ? oName.GetString() : "",
                    role = org.TryGetProperty("role", out var oRole) ? oRole.GetString() : ""
                });
            }

            return Results.Ok(new
            {
                requiresOrgSelection = true,
                requiresValidation = false,
                selectionToken = selTokenProp.GetString(),
                organizations
            });
        }

        var token = root.TryGetProperty("token", out var tokProp) ? tokProp.GetString() ?? "" : "";
        var refresh = root.TryGetProperty("refresh", out var refProp) ? refProp.GetString() ?? "" : "";
        var userId = root.TryGetProperty("userId", out var uIdProp) ? uIdProp.GetString() ?? "" : "";
        var profileId = root.TryGetProperty("id", out var idProp) && idProp.TryGetInt32(out var pId) ? pId : (int?)null;
        var role = root.TryGetProperty("role", out var rProp) ? rProp.GetString() ?? "user" : "user";
        var organizationId = root.TryGetProperty("organizationId", out var orgIdProp) ? orgIdProp.GetString() ?? "" : "";
        var username = root.TryGetProperty("username", out var uNameProp) ? uNameProp.GetString() ?? "" : "";
        var expiresAt = root.TryGetProperty("expiresAt", out var expProp) && expProp.TryGetInt64(out var expVal) ? expVal : 0L;

        var profileDetails = await FetchProfileExportAsync(token, client, cache);
        var displayName = !string.IsNullOrWhiteSpace(customDisplayName)
            ? customDisplayName.Trim()
            : (!string.IsNullOrWhiteSpace(profileDetails.DisplayName)
                ? profileDetails.DisplayName
                : (!string.IsNullOrWhiteSpace(username) ? username : "Usuário Transicionais"));

        await EnsureVoterExistsAsync(displayName, db);

        return Results.Ok(new
        {
            requiresOrgSelection = false,
            requiresValidation = false,
            token,
            refresh,
            userId,
            profileId = profileDetails.ProfileId ?? profileId,
            username,
            displayName,
            email = profileDetails.Email,
            role = !string.IsNullOrWhiteSpace(profileDetails.Role) ? profileDetails.Role : role,
            organizationId,
            organizationName = profileDetails.OrganizationName,
            groups = profileDetails.Groups,
            expiresAt
        });
    }

    private static async Task<(bool Success, int? ProfileId, string DisplayName, string Email, string Role, string OrganizationName, List<string> Groups)> FetchProfileExportAsync(
        string accessToken,
        HttpClient client,
        IMemoryCache cache)
    {
        var groups = new List<string>();
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return (false, null, string.Empty, string.Empty, string.Empty, string.Empty, groups);
        }

        var cacheKey = $"transicionais_profile_{HashPassword(accessToken)}";
        if (cache.TryGetValue<(bool, int?, string, string, string, string, List<string>)>(cacheKey, out var cachedProfile))
        {
            return cachedProfile;
        }

        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{TransicionaisBaseUrl}/apps_nodejs/v2/account/export");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var resp = await client.SendAsync(req);
            if (!resp.IsSuccessStatusCode)
            {
                return (false, null, string.Empty, string.Empty, string.Empty, string.Empty, groups);
            }

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
            var root = doc.RootElement;

            int? profileId = null;
            string name = string.Empty;
            string email = string.Empty;
            string role = string.Empty;
            string orgName = string.Empty;

            if (root.TryGetProperty("profile", out var prof) && prof.ValueKind == JsonValueKind.Object)
            {
                if (prof.TryGetProperty("id", out var idP) && idP.TryGetInt32(out var pid)) profileId = pid;
                if (prof.TryGetProperty("name", out var nameP)) name = nameP.GetString() ?? string.Empty;
                if (prof.TryGetProperty("email", out var emailP)) email = emailP.GetString() ?? string.Empty;
                if (prof.TryGetProperty("role", out var roleP)) role = roleP.GetString() ?? string.Empty;
                if (prof.TryGetProperty("organizationName", out var orgP)) orgName = orgP.GetString() ?? string.Empty;
            }

            if (root.TryGetProperty("groups", out var groupsArr) && groupsArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var g in groupsArr.EnumerateArray())
                {
                    if (g.TryGetProperty("groupName", out var gn))
                    {
                        var gName = gn.GetString();
                        if (!string.IsNullOrWhiteSpace(gName)) groups.Add(gName);
                    }
                }
            }

            var result = (true, profileId, name, email, role, orgName, groups);
            cache.Set(cacheKey, result, TimeSpan.FromMinutes(5));
            return result;
        }
        catch
        {
            return (false, null, string.Empty, string.Empty, string.Empty, string.Empty, groups);
        }
    }

    private static async Task EnsureVoterExistsAsync(string rawName, AppDbContext db)
    {
        var clean = Regex.Replace(rawName.Replace('\u00A0', ' ').Trim(), @"\s+", " ");
        if (string.IsNullOrWhiteSpace(clean)) return;

        var exists = await db.Voters.AnyAsync(v => v.Name.ToLower() == clean.ToLower());
        if (!exists)
        {
            db.Voters.Add(new Voter
            {
                Name = clean,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
    }
}
