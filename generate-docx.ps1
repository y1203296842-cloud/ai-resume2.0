$baseUrl = "http://localhost:3199/api/export"
$outputDir = "C:\Users\86157\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a761bd4dc0ffb039974f496\ganlin-ai\test-output"

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$json = Get-Content "C:\Users\86157\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a761bd4dc0ffb039974f496\ganlin-ai\test-resume-data.json" -Raw | ConvertFrom-Json

$templates = @("modern", "business", "campus", "wenneker", "altacv")

foreach ($tpl in $templates) {
    $json.templateId = $tpl
    $body = $json | ConvertTo-Json -Depth 10

    Write-Host "Generating DOCX for template: $tpl"

    try {
        $response = Invoke-WebRequest -Uri $baseUrl -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
        $outputPath = Join-Path $outputDir "resume-$tpl.docx"
        [System.IO.File]::WriteAllBytes($outputPath, $response.Content)
        Write-Host "  Saved to: $outputPath ($($response.Content.Length) bytes)"
    } catch {
        Write-Host "  ERROR: $_"
    }
}

Write-Host "`nAll DOCX files generated."
