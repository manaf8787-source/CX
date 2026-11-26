using System.Text.Json;
using System.Text.Json.Serialization;

namespace PsiCx.Domain;

/// <summary>The one JSON setup for the API, so enums and property names match the frontend types.</summary>
public static class PsiJson
{
    public static void Configure(JsonSerializerOptions o)
    {
        o.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        o.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    }

    public static JsonSerializerOptions Create()
    {
        var o = new JsonSerializerOptions();
        Configure(o);
        return o;
    }
}
