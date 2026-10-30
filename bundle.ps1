$root = "C:\Users\Akshini Randive\.gemini\antigravity\scratch\beyond-barriers"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Read index.html and CSS with explicit UTF-8
$html = [System.IO.File]::ReadAllText("$root\index.html", $utf8NoBom)
$css = [System.IO.File]::ReadAllText("$root\css\styles.css", $utf8NoBom)

# Replace CSS link with inline <style>
$html = $html -replace '<link rel="stylesheet" href="css/styles.css">', "<style>`n$css`n</style>"

# Replace script tags with inlined scripts
$scripts = @(
    "three.min.js",
    "audio.js",
    "accessibility.js",
    "character.js",
    "input.js",
    "arena.js",
    "sports/SportBase.js",
    "sports/BasketballSport.js",
    "sports/FootballSport.js",
    "sports/TennisSport.js",
    "sports/BadmintonSport.js",
    "sports/BowlingSport.js",
    "sports/ArcherySport.js",
    "app.js"
)

$allJs = ""
foreach ($s in $scripts) {
    $scriptPath = Join-Path "$root\js" $s
    $scriptContent = [System.IO.File]::ReadAllText($scriptPath, $utf8NoBom)
    $allJs += "`n/* === FILE: $s === */`n" + $scriptContent + "`n"
}

# Remove existing script tags and insert bundled script before </body>
$pattern = '(?s)<script src="js/[^"]+"></script>\s*'
$html = [System.Text.RegularExpressions.Regex]::Replace($html, $pattern, '')
$html = $html -replace '</body>', "<script>`n$allJs`n</script>`n</body>"

# Write out index_bundled.html with clean UTF-8
[System.IO.File]::WriteAllText("$root\index_bundled.html", $html, $utf8NoBom)

# Also copy to artifact directory
$artifactPath = "C:\Users\Akshini Randive\.gemini\antigravity\brain\ee6d655b-cd8b-4f33-a932-ece8bd1f246a\beyond_barriers_game.html"
[System.IO.File]::WriteAllText($artifactPath, $html, $utf8NoBom)

Write-Host "Bundling complete! Size: $((Get-Item "$root\index_bundled.html").Length) bytes"
