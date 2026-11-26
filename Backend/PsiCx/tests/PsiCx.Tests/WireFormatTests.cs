using System.Text.Json;
using PsiCx.Domain;

namespace PsiCx.Tests;

public class WireFormatTests
{
    private static readonly JsonSerializerOptions Json = PsiJson.Create();

    [Theory]
    [InlineData(EnvId.Dub, "\"dub\"")]
    [InlineData(EnvId.Ai, "\"ai\"")]
    [InlineData(RoleId.Cxmgr, "\"cxmgr\"")]
    [InlineData(RoleId.Auditmkt, "\"auditmkt\"")]
    [InlineData(ProductId.Wl, "\"wl\"")]
    [InlineData(ChannelId.Googleplay, "\"googleplay\"")]
    [InlineData(Severity.Critical, "\"critical\"")]
    public void Enums_use_the_frontend_ids(object value, string expected)
        => Assert.Equal(expected, JsonSerializer.Serialize(value, value.GetType(), Json));

    [Fact]
    public void Bi_uses_en_and_ar()
        => Assert.Equal("{\"en\":\"Hello\",\"ar\":\"مرحبا\"}",
            JsonSerializer.Serialize(new Bi("Hello", "مرحبا"), Json).Replace("\\u0645\\u0631\\u062D\\u0628\\u0627", "مرحبا"));

    [Fact]
    public void Consent_flags_round_trip()
    {
        var json = JsonSerializer.Serialize(new ConsentFlags(true, false, true, true), Json);
        Assert.Equal("{\"dncr\":true,\"whatsapp\":false,\"sms\":true,\"email\":true}", json);
    }

    [Fact]
    public void Env_scope_all_includes_every_environment()
    {
        Assert.True(EnvScope.All.Includes(EnvId.Ast));
        Assert.True(EnvScope.Of(EnvId.Auh).Includes(EnvId.Auh));
        Assert.False(EnvScope.Of(EnvId.Auh).Includes(EnvId.Dub));
    }
}

public class SnakeCaseWireTests
{
    private static readonly System.Text.Json.JsonSerializerOptions Json = PsiJson.Create();

    [Theory]
    [InlineData(CallStatus.ToDo, "\"to_do\"")]
    [InlineData(CallStatus.NeedsHuman, "\"needs_human\"")]
    [InlineData(CallChannel.AiCampaign, "\"ai_campaign\"")]
    [InlineData(SignalKind.PublicMention, "\"public_mention\"")]
    [InlineData(SignalKind.LegalPrivacySafety, "\"legal_privacy_safety\"")]
    [InlineData(PatternThresholdKind.EnvironmentConcentration, "\"environment_concentration\"")]
    public void Multi_word_enums_use_snake_case_like_the_frontend(object value, string expected)
        => Assert.Equal(expected, System.Text.Json.JsonSerializer.Serialize(value, value.GetType(), Json));
}
