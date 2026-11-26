namespace PsiCx.Application;

public enum Failure { Unauthenticated, Forbidden, NotFound, Conflict, Invalid }

/// <summary>What a service returns: a value, or a reason it refused. The API maps the reason to an HTTP status.</summary>
public sealed class ServiceResult<T>
{
    public T? Value { get; }
    public Failure? Error { get; }
    public string? Message { get; }
    public bool IsOk => Error is null;

    private ServiceResult(T? value, Failure? error, string? message) { Value = value; Error = error; Message = message; }

    public static ServiceResult<T> Ok(T value) => new(value, null, null);
    public static ServiceResult<T> Fail(Failure error, string message) => new(default, error, message);
}
