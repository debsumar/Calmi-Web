# Runs mcp-remote against Vercel MCP once, in its own window, so the OAuth
# browser window opens and credentials are cached under ~/.mcp-auth.
# After it prints "Connected to remote server", the token is stored and you can
# close the window; Kiro will reuse the cached credentials.
$port = 7788
Write-Host "Starting mcp-remote OAuth flow for https://mcp.vercel.com (callback port $port)..."
Write-Host "A browser window should open. Approve access to your Vercel account."
Write-Host ''
npx -y mcp-remote@0.1.38 https://mcp.vercel.com $port
