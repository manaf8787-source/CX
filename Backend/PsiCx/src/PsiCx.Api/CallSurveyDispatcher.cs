using PsiCx.Application;

namespace PsiCx.Api;

/// <summary>Every minute sends the call surveys that are due. A failed run is logged and tried again at the next tick.</summary>
public sealed class CallSurveyDispatcher(CallSurveyService service, ILogger<CallSurveyDispatcher> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (await timer.WaitForNextTickAsync(stop))
        {
            try { await service.DispatchDueAsync(stop); }
            catch (Exception e) when (e is not OperationCanceledException) { log.LogError(e, "Call survey dispatch failed"); }
        }
    }
}
