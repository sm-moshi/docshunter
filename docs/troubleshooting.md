# Troubleshooting Guide

Common issues and solutions for Docshunter installation and operation.

## MCP Connection Issues

### Connection Failed / Server Not Found

**Symptoms**: Cursor/Claude Desktop can't connect to Docshunter MCP server

**Solutions**:

```bash
# 1. Check Node.js path accessibility
which node
# Should return: ~/.local/share/mise/installs/node/22.15.1/bin/node (or similar)

# 2. Verify build completed successfully
ls build/main.js
# Should exist and be recent

# 3. Check MCP configuration syntax
cat .cursor/mcp.json | jq '.'
# Should parse without errors

# 4. Test server startup manually
node build/main.js
# Should not exit immediately with errors
```

**Common Fixes**:

- Use **absolute paths** in mcp.json configuration
- Ensure Node.js version 18+ is installed
- Verify build directory exists and is populated

### Protocol Errors (-32000, -32601)

**Symptoms**: JSON-RPC protocol errors in logs

**Causes & Fixes**:

- **stdout contamination**: Remove any `console.log` statements from server code
- **Invalid tool names**: Use underscores (`_`) not dashes (`-`) in tool names
- **Malformed JSON**: Check all JSON-RPC message formatting

## Tool Execution Failures

### Browser Automation Issues

**Puppeteer Launch Failed**:

```bash
# Install Chrome/Chromium
# macOS:
brew install chromium

# Linux:
sudo apt-get install chromium-browser

# Verify Puppeteer can find browser
npx puppeteer browsers install chrome
```

**Navigation Timeouts**:

- Increase timeout values in `src/server/config.ts`
- Check network connectivity and firewall settings
- Verify target websites are accessible

### Database Errors

**SQLite Permission Denied**:

```bash
# Check file permissions
ls -la docshunter.db

# Fix permissions if needed
chmod 644 docshunter.db
```

**Database Locked**:

- Ensure no other processes are using the database
- Check for proper connection cleanup in code
- Consider WAL mode for better concurrency

### Content Extraction Issues

**Empty or Garbled Content**:

- Website may be JavaScript-heavy (requires browser rendering)
- Check for anti-bot measures or rate limiting
- Verify selectors for gitingest.com parsing

**GitHub URL Processing**:

- Ensure URL is a valid GitHub repository
- Check gitingest.com availability
- Verify fallback mechanisms are working

## Performance Issues

### Slow Response Times

**Browser Automation Bottlenecks**:

```typescript
// Increase timeouts in config.ts
export const CONFIG = {
  PAGE_TIMEOUT: 45000,        // Increase from 30000
  SELECTOR_TIMEOUT: 15000,    // Increase from 10000
  MAX_RETRIES: 5,            // Increase from 3
};
```

**Memory Usage**:

- Monitor browser process memory with Activity Monitor/htop
- Ensure proper browser cleanup after operations
- Consider browser instance pooling for high usage

### High Resource Usage

**Browser Memory Leaks**:

- Check for unclosed browser instances: `ps aux | grep chrome`
- Verify proper cleanup in error scenarios
- Monitor disk space for SQLite growth

## Development Issues

### TypeScript Compilation Errors

**Common Fixes**:

```bash
# Clean build and rebuild
rm -rf build/
pnpm build

# Check TypeScript configuration
npx tsc --noEmit

# Verify all dependencies are installed
pnpm install
```

### Test Failures

**Environment Issues**:

- Ensure test database is writable
- Check for port conflicts
- Verify mock configurations are correct

### Linting Errors

**Process.env Access**:

```typescript
// Wrong:
process.env.NODE_ENV = "test";

// Correct:
process.env["NODE_ENV"] = "test";
```

## Network and Security

### Firewall / Proxy Issues

**Corporate Networks**:

- Configure proxy settings for HTTP requests
- Whitelist chromium/puppeteer domains
- Check for SSL certificate validation issues

### Anti-Bot Detection

**Website Blocking**:

- Sites may detect automation and block requests
- Consider adding delays between requests
- Rotate user agents if necessary
- Use residential IP if possible

## Getting Help

### Log Analysis

**Enable Debug Logging**:

```bash
# Set debug mode in environment
NODE_ENV=development node build/main.js
```

**Check Browser Console**:

- Enable Puppeteer debug mode
- Capture network tab for failed requests
- Look for JavaScript errors on target pages

### Reporting Issues

When reporting bugs, include:

1. **Environment**: Node.js version, OS, Cursor/Claude Desktop version
2. **Configuration**: Sanitized mcp.json (remove sensitive paths)
3. **Logs**: Error messages and stack traces
4. **Reproduction**: Minimal steps to reproduce the issue
5. **Expected vs Actual**: What should happen vs what actually happens

### Community Support

- **GitHub Issues**: [Create an issue](https://github.com/sm-moshi/docshunter/issues)
- **Documentation**: Check other files in `docs/` directory
- **Best Practices**: Review `docs/best-practices.md`

---
*Last updated: May 23, 2025*
