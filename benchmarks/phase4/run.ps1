param([switch]$Live)
$ErrorActionPreference='Stop'
Push-Location (Join-Path $PSScriptRoot '../../backend')
try {
    foreach($mode in 'full-sequential-repeat','full-batch','incremental-sequential','incremental-batch'){
        $env:INDEX_BENCH=$mode
        ./mvnw.cmd -B test '-Dtest=SampleRagTest#indexingBenchmark'
        if($LASTEXITCODE){throw "Benchmark failed: $mode"}
    }
    Remove-Item Env:INDEX_BENCH
    $env:INDEX_SHARING='true'
    ./mvnw.cmd -B test '-Dtest=SampleRagTest#sharedIndexBenchmark'
    if($LASTEXITCODE){throw 'Shared-index benchmark failed'}
    Remove-Item Env:INDEX_SHARING
    $env:INDEX_RECOVERY_EVIDENCE='true'
    ./mvnw.cmd -B clean verify
    if($LASTEXITCODE){throw 'Verification failed'}
    if($Live){
        $env:INDEX_LIVE='true'
        ./mvnw.cmd -B test '-Dtest=SampleRagTest#livePublicIndex'
        if($LASTEXITCODE){throw 'Public repository smoke failed'}
    }
} finally {
    Remove-Item Env:INDEX_BENCH,Env:INDEX_RECOVERY_EVIDENCE,Env:INDEX_SHARING,Env:INDEX_LIVE -ErrorAction SilentlyContinue
    Pop-Location
}
