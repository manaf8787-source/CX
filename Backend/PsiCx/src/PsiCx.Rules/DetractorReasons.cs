using PsiCx.Domain;

namespace PsiCx.Rules;

/// <summary>
/// Why a customer is a detractor (26 Nov, owner). The reason comes from their own comment when they wrote one, then from the touchpoint
/// (a digital step is an app error, a maintenance visit is maintenance), then from the close-the-loop call notes; while the call is still to
/// be made it is "pending". The Classification agent will read the same inputs; until it is connected these keywords stand in. [Proposed]
/// </summary>
public static class DetractorReasons
{
    public static DetractorTheme ThemeOf(DetractorReason r) => r switch
    {
        DetractorReason.Knowledge or DetractorReason.Communication or DetractorReason.SlowReply or DetractorReason.Promise or DetractorReason.Other => DetractorTheme.People,
        DetractorReason.AppErrors => DetractorTheme.Digital,
        DetractorReason.Paperwork or DetractorReason.Maintenance => DetractorTheme.Process,
        DetractorReason.Price or DetractorReason.NothingSuitable => DetractorTheme.Commercial,
        _ => DetractorTheme.Pending,
    };

    // Order matters: the first group that matches wins, the most specific wording first.
    private static readonly (DetractorReason Reason, string[] Words)[] Keywords =
    [
        (DetractorReason.NothingSuitable, ["nothing suitable", "no suitable", "no unit", "لا شيء مناسب"]),
        (DetractorReason.Price, ["price", "payment plan", "expensive", "cost", "السعر", "خطة الدفع", "غالي"]),
        (DetractorReason.Paperwork, ["refund", "paperwork", "document", "deposit", "hand-off", "الاسترداد", "الأوراق", "تسليم الأوراق"]),
        (DetractorReason.Maintenance, ["maintenance", "repair", "air condition", "plumb", "الصيانة", "تصليح"]),
        (DetractorReason.AppErrors, ["app ", "website", "upload", "error", "crash", "bug", "failed", "التطبيق", "الموقع", "خطأ"]),
        (DetractorReason.Communication, ["rude", "attitude", "behav", "impolite", "غير لبق", "سلوك"]),
        (DetractorReason.Knowledge, ["wrong", "incorrect", "could not answer", "did not know", "didn't know", "misinformation", "خاطئ", "معلومات"]),
        (DetractorReason.SlowReply, ["no reply", "nobody called", "call back", "called back", "never answered", "slow", "waiting", "لا رد", "لم يتصل", "بطيء"]),
        (DetractorReason.Promise, ["promise", "follow up", "follow-up", "never came", "وعد", "متابعة"]),
    ];

    public static DetractorReason? FromText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var t = " " + text.ToLowerInvariant() + " ";
        foreach (var (reason, words) in Keywords)
            if (words.Any(w => t.Contains(w))) return reason;
        return null;
    }

    /// <param name="maintenanceTouchpoint">The moment was a maintenance visit.</param>
    /// <param name="callPending">The close-the-loop call has not been made yet.</param>
    public static DetractorReason Classify(string? comment, string? callNotes, bool digital, bool maintenanceTouchpoint, bool callPending)
        => (FromText(comment)
           ?? (digital ? DetractorReason.AppErrors : (DetractorReason?)null)
           ?? (maintenanceTouchpoint ? DetractorReason.Maintenance : (DetractorReason?)null)
           ?? FromText(callNotes)
           ?? (callPending ? DetractorReason.Pending : DetractorReason.Other));
}
