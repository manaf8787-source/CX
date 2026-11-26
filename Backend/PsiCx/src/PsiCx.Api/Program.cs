using PsiCx.Application;
using PsiCx.Api;
using PsiCx.Domain;
using PsiCx.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(o => PsiJson.Configure(o.JsonSerializerOptions));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddHttpContextAccessor();

// Storage: in memory until the database is chosen with the CTO (EF Core stores replace these two lines).
builder.Services.AddSingleton<IAuditStore, InMemoryAuditStore>();
builder.Services.AddSingleton<ISettingsStore, InMemorySettingsStore>();
builder.Services.AddSingleton<AuditService>();
builder.Services.AddSingleton<SettingsService>();

// Who is calling: headers in Development only; everywhere else every call is 401 until sign-in (SSO) exists.
if (builder.Environment.IsDevelopment()) builder.Services.AddScoped<ICurrentUser, DevCurrentUser>();
else builder.Services.AddScoped<ICurrentUser, NoCurrentUser>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();

// Needed by the test project (WebApplicationFactory).
public partial class Program { }
