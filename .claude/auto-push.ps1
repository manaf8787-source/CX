$repo = 'C:\Users\xele\Desktop\CX'
$log = Join-Path $env:LOCALAPPDATA 'cx-auto-push.log'
function Log($m) { Add-Content -Path $log -Value ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $m) -Encoding utf8 }

Set-Location $repo
if ((Test-Path '.git\rebase-merge') -or (Test-Path '.git\rebase-apply') -or (Test-Path '.git\MERGE_HEAD')) {
    Log 'Skipped: a merge or rebase is in progress.'
    exit 0
}

git add -A 2>&1 | Out-Null

# GitHub rejects files over 100 MB; leave them out of the commit.
$staged = git diff --cached --name-only --diff-filter=AM
foreach ($f in $staged) {
    $p = Join-Path $repo $f
    if ((Test-Path $p) -and ((Get-Item $p).Length -gt 95MB)) {
        git reset -q -- "$f"
        Log "Left out (over 95 MB): $f"
    }
}

git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -q -m ("Auto-save {0:yyyy-MM-dd HH:mm}" -f (Get-Date)) 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Log 'Commit failed (a hook may have blocked it).'; exit 1 }
    Log 'Committed changes.'
}

git push -q origin HEAD 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    git pull -q --rebase --autostash origin main 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        git rebase --abort 2>&1 | Out-Null
        Log 'Push rejected and rebase hit a conflict; left as is for manual fix.'
        exit 1
    }
    git push -q origin HEAD 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Log 'Push failed after rebase.'; exit 1 }
}
Log 'Pushed.'
