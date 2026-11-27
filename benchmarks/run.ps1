param(
    [Parameter(Mandatory)][ValidateSet('node','sequential','batch')][string]$Mode,
    [Parameter(Mandatory)][string]$PostgresBin
)
$ErrorActionPreference='Stop'
Push-Location (Join-Path $PSScriptRoot '..')
$dir=Join-Path ([IO.Path]::GetTempPath()) ('openscout-bench-'+[guid]::NewGuid())
$pwfile="$dir.pw"
$started=$false
$fixture=$null
try {
    $env:OPENSCOUT_TEST_PASSWORD=[guid]::NewGuid().ToString('N')
    $env:OPENSCOUT_TEST_PORT='58437'
    Set-Content $pwfile $env:OPENSCOUT_TEST_PASSWORD -Encoding ASCII
    & "$PostgresBin/initdb" -D $dir -U openscout_test -A scram-sha-256 "--pwfile=$pwfile"
    if($LASTEXITCODE){throw 'initdb failed'}
    & "$PostgresBin/pg_ctl" -D $dir -o '-h 127.0.0.1 -p 58437' -l "$dir/server.log" -w start
    if($LASTEXITCODE){throw 'Disposable port unavailable'}
    $started=$true
    if($Mode -eq 'node'){
        $env:DATABASE_URL="postgresql://openscout_test:"+$env:OPENSCOUT_TEST_PASSWORD+"@127.0.0.1:58437/postgres"
        $env:JWT=[guid]::NewGuid().ToString()
        & ./node_modules/.bin/prisma.cmd generate
        if($LASTEXITCODE){throw 'Prisma generation failed'}
        & ./node_modules/.bin/prisma.cmd migrate deploy
        if($LASTEXITCODE){throw 'Prisma migration failed'}
        node benchmarks/node.cjs
    } else {
        $env:OPENSCOUT_BENCH=$Mode
        $fixture=Start-Process -WindowStyle Hidden -FilePath (Get-Command node).Source -ArgumentList 'benchmarks/fixture.cjs' -PassThru
        Set-Location backend
        ./mvnw.cmd -B verify '-Dtest=IdentityIntegrationTest#importBenchmark'
    }
    if($LASTEXITCODE){throw 'Benchmark failed'}
} finally {
    if($fixture -and !$fixture.HasExited){$fixture.Kill()}
    if($started){& "$PostgresBin/pg_ctl" -D $dir -m fast -w stop}
    if(Test-Path $pwfile){Remove-Item -LiteralPath $pwfile}
    Pop-Location
}
