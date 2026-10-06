<#
.SYNOPSIS
    Builds theDAW's live VST3 host for the launcher.

.DESCRIPTION
    Runs app\native\vst-host\build.ps1. When that script stops with

        No Visual Studio with the C++ build tools was found. Install the Visual
        Studio Build Tools with the "Desktop development with C++" workload,
        then run this again.

    this does what the message asks: it installs the Visual Studio Build Tools
    with that workload and runs the build again. Any other failure is left as
    it is, with build.ps1's own output above it.

    Install, Update and Build VST3 Host all call this file.
#>
$ErrorActionPreference = 'Continue'

$build = Join-Path $PSScriptRoot 'app\native\vst-host\build.ps1'
if (-not (Test-Path $build)) {
    Write-Host "theDAW: $build is missing, so there is no host to build."
    exit 1
}

# build.ps1 picks the Visual Studio generator itself. Pinokio's own cmake module
# sets this to MinGW Makefiles.
Remove-Item Env:CMAKE_GENERATOR -ErrorAction SilentlyContinue

function Invoke-HostBuild {
    # -NoWerror: a user's compiler is not the one theDAW's CI builds with.
    $script:buildLog = ''
    & powershell -NoProfile -ExecutionPolicy Bypass -File $build -NoWerror 2>&1 | ForEach-Object {
        $line = "$_"
        Write-Host $line
        $script:buildLog += "$line "
    }
    return $LASTEXITCODE
}

$code = Invoke-HostBuild
$noVisualStudio = ($script:buildLog -replace '\s+', ' ') -match 'No Visual Studio with the C\+\+ build tools was found'

if ($code -ne 0 -and $noVisualStudio) {
    Write-Host ''
    Write-Host 'theDAW: installing the Visual Studio Build Tools with the "Desktop development with C++" workload, as the message above asks.'
    Write-Host 'theDAW: this downloads several GB and takes a while. Windows may ask for permission.'
    $installer = Join-Path $env:TEMP 'vs_buildtools.exe'
    try {
        Invoke-WebRequest -UseBasicParsing -Uri 'https://aka.ms/vs/17/release/vs_buildtools.exe' -OutFile $installer
    } catch {
        Write-Host "theDAW: the Build Tools installer could not be downloaded: $($_.Exception.Message)"
        exit 1
    }
    $arguments = @(
        '--passive', '--wait', '--norestart', '--nocache',
        '--add', 'Microsoft.VisualStudio.Workload.VCTools',
        '--includeRecommended'
    )
    $installed = Start-Process -FilePath $installer -ArgumentList $arguments -Wait -PassThru
    # 3010 is a finished install that wants a restart later.
    Write-Host "theDAW: the Build Tools installer finished with code $($installed.ExitCode). Building the host again."
    $code = Invoke-HostBuild
}

exit $code
