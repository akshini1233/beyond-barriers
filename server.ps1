# BEYOND BARRIERS - INCLUSIVE VR SPORTS
# High-Performance Standalone Web Server for Desktop & Meta Quest WebXR Testing
# Uses System.Net.Sockets.TcpListener (no admin privileges required; binds to 0.0.0.0)

$portsToTry = @(8080, 8085, 8090)
$port = 8080
$listener = $null

foreach ($p in $portsToTry) {
    try {
        $l = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Any, $p)
        $l.Start()
        $listener = $l
        $port = $p
        break
    } catch {
        # Port might be occupied, try next
    }
}

if ($null -eq $listener) {
    Write-Error "Could not bind to any port in @(8080, 8085, 8090)."
    exit 1
}

$ipAddresses = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | 
    Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -notmatch '^127\.' }

Write-Output "=========================================================================="
Write-Output "   BEYOND BARRIERS - INCLUSIVE VR SPORTS HTTP SERVER (TCP)"
Write-Output "=========================================================================="
Write-Output " Local Desktop PC       : http://localhost:$port/"
foreach ($ip in $ipAddresses) {
    Write-Output " Meta Quest VR LAN URL  : http://$($ip.IPAddressToString):$port/"
}
Write-Output "=========================================================================="
Write-Output " Serving Single-File Bundle for instant refreshes and WebXR compatibility."
Write-Output " Press Ctrl+C in this console to stop the server."
Write-Output "=========================================================================="

$baseDir = $PSScriptRoot

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII)
        
        $requestLine = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($requestLine)) {
            $client.Close()
            continue
        }

        $parts = $requestLine.Split(" ")
        $method = $parts[0]
        $rawPath = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
        $urlPath = $rawPath.Split("?")[0]

        if ($urlPath -eq "/" -or $urlPath -eq "/index.html" -or $urlPath -eq "/index_bundled.html") {
            $filePath = Join-Path $baseDir "index_bundled.html"
            if (-not (Test-Path $filePath)) {
                $filePath = Join-Path $baseDir "index.html"
            }
        } else {
            $cleanPath = $urlPath.TrimStart("/").Replace("/", "\")
            $filePath = Join-Path $baseDir $cleanPath
        }

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                ".ico"  { "image/x-icon" }
                default { "application/octet-stream" }
            }

            $header = "HTTP/1.1 200 OK`r`n" +
                      "Content-Type: $contentType`r`n" +
                      "Content-Length: $($bytes.Length)`r`n" +
                      "Access-Control-Allow-Origin: *`r`n" +
                      "Access-Control-Allow-Methods: GET, HEAD, OPTIONS`r`n" +
                      "Access-Control-Allow-Headers: *`r`n" +
                      "Cache-Control: no-cache, no-store, must-revalidate`r`n" +
                      "Connection: close`r`n`r`n"

            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            if ($method -ne "HEAD") {
                $stream.Write($bytes, 0, $bytes.Length)
            }
        } else {
            $body = "404 - File Not Found: $urlPath"
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
            $header = "HTTP/1.1 404 Not Found`r`n" +
                      "Content-Type: text/plain; charset=utf-8`r`n" +
                      "Content-Length: $($bodyBytes.Length)`r`n" +
                      "Access-Control-Allow-Origin: *`r`n" +
                      "Connection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            if ($method -ne "HEAD") {
                $stream.Write($bodyBytes, 0, $bodyBytes.Length)
            }
        }

        $stream.Flush()
        $client.Close()
    } catch {
        # Handle client disconnect gracefully
        if ($client) {
            try { $client.Close() } catch {}
        }
    }
}
