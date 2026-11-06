param([string]$SdkPath=$env:ANDROID_HOME,[string]$JdkPath=$env:JAVA_HOME)
$ErrorActionPreference='Stop'
$mobileRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$originalLocation=(Get-Location).Path
$previousEnv=@{}
foreach($envName in @('ANDROID_HOME','ANDROID_SDK_ROOT','JAVA_HOME','Path','GRADLE_USER_HOME','NODE_ENV')){$previousEnv[$envName]=[Environment]::GetEnvironmentVariable($envName,'Process')}
Set-Location -LiteralPath $mobileRoot
if(!$SdkPath){$localSdk=Join-Path $mobileRoot '.android-sdk';$installedSdk=Join-Path $env:LOCALAPPDATA 'Android/Sdk';if(Test-Path -LiteralPath $localSdk){$SdkPath=$localSdk}else{$SdkPath=$installedSdk}}
if(!$JdkPath){$candidate='C:\Program Files\Java\jdk-21.0.10';if(Test-Path -LiteralPath $candidate){$JdkPath=$candidate}}
if(!(Test-Path -LiteralPath $SdkPath)){throw 'Install Android SDK or pass -SdkPath. See README.md.'}
if(!$JdkPath -or !(Test-Path -LiteralPath (Join-Path $JdkPath 'bin/java.exe'))){throw 'Install JDK 21 and pass -JdkPath.'}
$sdkAbsolute=[IO.Path]::GetFullPath($SdkPath)
$cacheDrive=$null
try {
  $buildRoot=$mobileRoot
  Set-Location -LiteralPath $buildRoot
  $env:ANDROID_HOME=if($sdkAbsolute.StartsWith($mobileRoot,[StringComparison]::OrdinalIgnoreCase)){Join-Path $buildRoot $sdkAbsolute.Substring($mobileRoot.Length).TrimStart('\','/')}else{$sdkAbsolute}
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:JAVA_HOME=$JdkPath
$env:Path="$JdkPath\bin;$env:Path"
$cacheRoot=if($previousEnv['GRADLE_USER_HOME']){$previousEnv['GRADLE_USER_HOME']}else{Join-Path $mobileRoot '.gradle-local'}
New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null
# Only alias the dependency cache, never the project root: Expo codegen needs all source roots on D:.
# This keeps large cache files on the project drive and shortens prefab header paths for Ninja.
if($cacheRoot.Length -gt 30){
  $occupied=[Environment]::GetLogicalDrives()
  foreach($letter in @('V','W','X','Y','Z')){if($occupied -notcontains "${letter}:\"){$cacheDrive="${letter}:";break}}
  if(!$cacheDrive){throw 'No free drive letter for the temporary Gradle cache alias.'}
  & subst.exe $cacheDrive $cacheRoot
  if($LASTEXITCODE -ne 0){$cacheDrive=$null;throw 'Cannot create temporary Gradle cache alias.'}
  $env:GRADLE_USER_HOME="$cacheDrive\"
}else{$env:GRADLE_USER_HOME=$cacheRoot}
$env:NODE_ENV='production'
function Invoke-CheckedNative([scriptblock]$Command){
  $oldPreference=$ErrorActionPreference
  $ErrorActionPreference='Continue' # Windows PowerShell treats native stderr warnings as ErrorRecords.
  & $Command
  $nativeExit=$LASTEXITCODE
  $ErrorActionPreference=$oldPreference
  if($nativeExit -ne 0){throw "Native command failed (exit $nativeExit)"}
}
Invoke-CheckedNative { npm.cmd run check }
Invoke-CheckedNative { npx.cmd expo prebuild --platform android --no-install }
Set-Location -LiteralPath (Join-Path $buildRoot 'android')
Invoke-CheckedNative { ./gradlew.bat assembleRelease ':oral-audio:testDebugUnitTest' '-PreactNativeArchitectures=arm64-v8a' --no-daemon --max-workers=2 }
Set-Location -LiteralPath $mobileRoot
New-Item -ItemType Directory -Force -Path artifacts | Out-Null
Copy-Item -LiteralPath android/app/build/outputs/apk/release/app-release.apk -Destination artifacts/avies-student-demo-arm64.apk -Force
Get-FileHash -Algorithm SHA256 -LiteralPath artifacts/avies-student-demo-arm64.apk
Write-Output 'APK local ready: artifacts/avies-student-demo-arm64.apk. Demo signing only; no Play Console or paid build service used.'
} finally {
  Set-Location -LiteralPath $originalLocation
  if($cacheDrive){& subst.exe $cacheDrive /D}
  foreach($envName in $previousEnv.Keys){[Environment]::SetEnvironmentVariable($envName,$previousEnv[$envName],'Process')}
}
