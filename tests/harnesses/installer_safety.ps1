param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('running', 'roaming', 'preflight-throw', 'preflight-nonzero',
        'live-throw', 'live-nonzero', 'settle-throw', 'settle-nonzero',
        'register-throw', 'register-nonzero', 'register-generic-throw',
        'missing-exe', 'missing-package', 'copy-throw', 'success')]
    [string]$Scenario
)

$ErrorActionPreference = 'Stop'
. (Join-Path -Path $PSScriptRoot -ChildPath '../../installer_core.ps1')

# No real operation factory, cmdlet shadowing, filesystem fixture, or native call.
# Paths below are synthetic strings; only the version-tracked file above is read.
$Events = [System.Collections.Generic.List[object]]::new()
$State = @{ RuntimeRemoved = $false; RuntimeCreated = $false }
$Ops = @{
    TestPath = {
        param($Phase, $Path)
        $Exists = $true
        if ($Path -eq 'C:\synthetic\roaming\DynamicsHelper') {
            $Exists = $Scenario -eq 'roaming'
        } elseif ($Path -eq 'C:\synthetic\package\host\dh_native_host.exe' -and $Scenario -eq 'missing-package') {
            $Exists = $false
        } elseif ($Path -eq 'C:\synthetic\local\DynamicsHelper\dh_native_host.exe' -and $Scenario -eq 'missing-exe') {
            $Exists = $false
        } elseif ($Path -eq 'C:\synthetic\local\DynamicsHelper\_internal' -and $State.RuntimeRemoved) {
            $Exists = $State.RuntimeCreated
        } elseif ($Path -eq 'C:\synthetic\local\DynamicsHelper\_internal\nested') {
            $Exists = $false
        }
        $Events.Add([pscustomobject]@{ kind = 'test-path'; phase = $Phase; path = $Path; exists = $Exists })
        return $Exists
    }
    RunningHost = {
        $Events.Add([pscustomobject]@{ kind = 'running-host'; phase = 'refusal' })
        return $Scenario -eq 'running'
    }
    CreateDirectory = {
        param($Phase, $Path)
        $Events.Add([pscustomobject]@{ kind = 'create-directory'; phase = $Phase; path = $Path })
        if ($Path -eq 'C:\synthetic\local\DynamicsHelper\_internal') { $State.RuntimeCreated = $true }
    }
    CopyFiles = {
        param($Phase, $Source, $Destination, [bool]$Recurse)
        $Events.Add([pscustomobject]@{
            kind = 'copy'; phase = $Phase; source = $Source; destination = $Destination; recurse = $Recurse
        })
        if ($Scenario -eq 'copy-throw') { throw 'virus blocked SECRET-ERROR' }
    }
    Enumerate = {
        param($Phase, $Root)
        $Events.Add([pscustomobject]@{ kind = 'enumerate'; phase = $Phase; path = $Root })
        if ($Phase -eq 'host-copy') {
            foreach ($Name in @('_internal', '_internal\nested')) {
                [pscustomobject]@{ RelativePath = $Name; IsDirectory = $true }
            }
            foreach ($Name in @('config.json', 'copilot-instructions.md', 'user_prompt.md',
                'dh_native_host.exe', '_internal\runtime.dll', '_internal\nested\library.dll',
                'release-integrity.json', 'installed-product.json', 'system_prompt.md')) {
                [pscustomobject]@{ RelativePath = $Name; IsDirectory = $false }
            }
        } else {
            [pscustomobject]@{ RelativePath = 'manifest.json'; IsDirectory = $false }
        }
    }
    RemoveTree = {
        param($Phase, $Path)
        $Events.Add([pscustomobject]@{ kind = 'remove-tree'; phase = $Phase; path = $Path })
        if ($Path -eq 'C:\synthetic\local\DynamicsHelper\_internal') { $State.RuntimeRemoved = $true }
    }
    InvokeHost = {
        param($Phase, $Executable, [string[]]$Arguments)
        $Events.Add([pscustomobject]@{
            kind = 'invoke-host'; phase = $Phase; executable = $Executable; arguments = @($Arguments)
        })
        if ($Scenario -eq ($Phase + '-throw')) { throw 'virus blocked SECRET-ERROR' }
        if ($Scenario -eq 'register-generic-throw' -and $Phase -eq 'register') {
            throw 'Access denied SECRET-ERROR'
        }
        $Code = if ($Scenario -eq ($Phase + '-nonzero')) { 17 } else { 0 }
        # Even successful native output is untrusted and must not enter the report.
        return [pscustomobject]@{ ExitCode = $Code; Output = 'SECRET-ERROR' }
    }
    Emit = {
        param($Phase, $Message, $Color)
        $Events.Add([pscustomobject]@{ kind = 'emit'; phase = $Phase; message = $Message })
    }
    Prompt = {
        param($Message)
        $Events.Add([pscustomobject]@{ kind = 'prompt'; phase = 'finish'; message = $Message })
    }
}

# Invalid tables must fail before Emit, Prompt, or any other effect. The factory
# is never used, including in these negative dependency checks.
foreach ($Key in @($Ops.Keys)) {
    foreach ($InvalidKind in @('missing', 'not-scriptblock', 'extra')) {
        $InvalidOps = $Ops.Clone()
        if ($InvalidKind -eq 'missing') { $InvalidOps.Remove($Key) }
        if ($InvalidKind -eq 'not-scriptblock') { $InvalidOps[$Key] = 'not executable' }
        if ($InvalidKind -eq 'extra') { $InvalidOps['Unexpected'] = {} }
        $Rejected = $false
        try {
            $null = Invoke-InstallerWorkflow -Ops $InvalidOps -PackageRoot 'C:\synthetic\package' -DestDir 'C:\synthetic\local\DynamicsHelper' -LegacyDir 'C:\synthetic\roaming\DynamicsHelper' -TempDir 'C:\synthetic\temp'
        } catch {
            $Rejected = $_.Exception.Message -eq 'Invalid installer operations.'
        }
        if (-not $Rejected -or $Events.Count -ne 0) { throw 'Installer dependency boundary failed.' }
    }
}

$Result = Invoke-InstallerWorkflow -Ops $Ops -PackageRoot 'C:\synthetic\package' -DestDir 'C:\synthetic\local\DynamicsHelper' -LegacyDir 'C:\synthetic\roaming\DynamicsHelper' -TempDir 'C:\synthetic\temp'
[pscustomobject]@{ exitCode = $Result.ExitCode; isUpdate = $Result.IsUpdate; events = @($Events.ToArray()) } | ConvertTo-Json -Depth 6 -Compress
exit $Result.ExitCode
