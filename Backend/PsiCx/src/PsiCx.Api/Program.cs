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
builder.Services.AddSingleton<IUserStore, InMemoryUserStore>();
builder.Services.AddSingleton<ICustomRoleStore, InMemoryCustomRoleStore>();
builder.Services.AddSingleton<AuditService>();
builder.Services.AddSingleton<UserService>();
builder.Services.AddSingleton<SettingsService>();
builder.Services.AddSingleton<IFixStore, InMemoryFixStore>();
builder.Services.AddSingleton<IInvestigationStore, InMemoryInvestigationStore>();
builder.Services.AddSingleton<IVipPatterns, NoVipPatterns>();
builder.Services.AddSingleton<SettingsFixClockInputs>();
builder.Services.AddSingleton<IFixClockInputs>(sp => sp.GetRequiredService<SettingsFixClockInputs>());
builder.Services.AddSingleton<IRulesSource>(sp => sp.GetRequiredService<SettingsFixClockInputs>());
builder.Services.AddSingleton<ISettingValidator, RulesValidator>();
builder.Services.AddSingleton<ISignalStore, InMemorySignalStore>();
builder.Services.AddSingleton<SignalService>();
builder.Services.AddSingleton<IPatternDirectory>(sp => sp.GetRequiredService<SignalService>());
builder.Services.AddSingleton<ISettingValidator, SurveySetsValidator>();
builder.Services.AddSingleton<ISurveyResponseStore, InMemorySurveyResponseStore>();
builder.Services.AddSingleton<SurveyService>();
builder.Services.AddSingleton<FixService>();
builder.Services.AddSingleton<IGiftStore, InMemoryGiftStore>();
builder.Services.AddSingleton<IGiftMailer, NoGiftMailer>();
builder.Services.AddSingleton<GiftService>();
builder.Services.AddSingleton<IInboxSource, FixInboxSource>();
builder.Services.AddSingleton<InboxService>();

// Who is calling: headers in Development only; everywhere else every call is 401 until sign-in (SSO) exists.
if (builder.Environment.IsDevelopment()) builder.Services.AddScoped<ICurrentUser, DevCurrentUser>();
else builder.Services.AddScoped<ICurrentUser, NoCurrentUser>();

var app = builder.Build();

// The sample directory (the prototype's people and two custom roles), for development only. Never in production.
if (app.Environment.IsDevelopment())
    await SampleDirectory.SeedAsync(app.Services.GetRequiredService<IUserStore>(), app.Services.GetRequiredService<ICustomRoleStore>());

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
