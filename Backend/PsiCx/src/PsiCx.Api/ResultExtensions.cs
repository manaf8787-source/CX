using Microsoft.AspNetCore.Mvc;
using PsiCx.Application;

namespace PsiCx.Api;

public static class ResultExtensions
{
    /// <summary>Maps a service result to HTTP: value 200; no actor 401; refused 403; missing 404; stale edit 409; bad input 400.</summary>
    public static IActionResult ToActionResult<T>(this ControllerBase c, ServiceResult<T> r) =>
        r.IsOk ? c.Ok(r.Value) : r.Error switch
        {
            Failure.Unauthenticated => c.Unauthorized(new ProblemDetails { Status = 401, Title = r.Message }),
            Failure.Forbidden => c.StatusCode(403, new ProblemDetails { Status = 403, Title = r.Message }),
            Failure.NotFound => c.NotFound(new ProblemDetails { Status = 404, Title = r.Message }),
            Failure.Conflict => c.Conflict(new ProblemDetails { Status = 409, Title = r.Message }),
            _ => c.BadRequest(new ProblemDetails { Status = 400, Title = r.Message }),
        };
}
