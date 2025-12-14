# AccessJet 🚀

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-45ba4b?logo=playwright&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

> **Blazing fast, DX-first accessibility (a11y) auditor** that delivers instant feedback without compromising accuracy. Built for modern development workflows where speed meets compliance.

![AccessJet Demo](assets/demo.svg)

## 🎯 The "Why" - Engineering Philosophy

### The Accuracy vs. Speed Trade-off

Accessibility auditing faces a fundamental tension: **accuracy requires loading complete pages**, but **speed demands optimization**. Traditional tools load everything—images, fonts, CSS, JavaScript—creating bottlenecks that make audits impractical for development workflows.

AccessJet resolves this through intelligent **Network Interception**. Using Playwright's `page.route()`, we selectively block resource-heavy assets (images, fonts, external scripts) while preserving the DOM structure essential for accurate Axe-core analysis. This achieves **sub-second audits** without sacrificing compliance accuracy.

```typescript
// Strategic asset blocking for performance
await page.route("**/*", (route) => {
  const resourceType = route.request().resourceType();
  if (["image", "font", "media"].includes(resourceType)) {
    route.abort(); // Block bloat, preserve structure
  } else {
    route.continue();
  }
});
```

## 🏗️ Architecture (The Interview Section)

### Singleton Pattern: Efficient Resource Management

AccessJet employs a **Singleton Browser Pattern** for optimal resource utilization. A single browser instance is initialized once and reused across multiple URL scans, eliminating startup overhead while maintaining complete isolation between audits.

```typescript
class PageScanner {
  private static browser: Browser | null = null;

  static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch();
    }
    return this.browser;
  }
}
```

### The Processing Pipeline

Raw accessibility data undergoes a sophisticated four-stage transformation:

```
Raw HTML → Prettier Formatting → Smart Truncation → Syntax Highlighting → CLI Output
```

- **Prettier**: Consistent, readable HTML formatting
- **Smart Truncation**: Container guards prevent `<html>`/`<body>` dumps, showing only relevant 10-line snippets
- **Syntax Highlighting**: CLI-highlight provides color-coded terminal output
- **CLI Output**: Structured tables with impact-level color coding

### Concurrency Engine

Powered by `p-limit`, the **BatchRunner** manages controlled parallel execution. Configurable concurrency prevents resource exhaustion while maximizing throughput for enterprise-scale auditing.

```typescript
const limit = pLimit(options.concurrency);
const results = await Promise.all(
  urls.map((url) => limit(() => scanSingleUrl(url)))
);
```

## ✨ Key Features

- ⚡ **Sub-Second Audits**: Network interception eliminates asset loading bottlenecks
- 🎯 **Smart Snippets**: Actionable HTML context instead of overwhelming page dumps
- 🔧 **CI/CD Thresholds**: Configurable `--fail-on` levels for progressive compliance adoption
- 🚀 **Zero-Config Setup**: Install and scan immediately, no complex configuration
- 📊 **Rich Developer Experience**: Color-coded output, progress spinners, structured reporting
- 📄 **JSON Export**: Full reports for integration with existing toolchains

## 🔗 CI/CD Integration

### GitHub Actions Workflow

Add this to `.github/workflows/accessibility.yml` for automated auditing:

```yaml
name: Accessibility Audit

on:
  pull_request:
    branches: [main, develop]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"

      - name: Install AccessJet
        run: npm install -g accessjet

      - name: Install Playwright Browsers
        run: npx playwright install chromium

      - name: Development Audit (Permissive)
        run: accessjet check --fail-on serious http://localhost:3000
        continue-on-error: true

      - name: Production Audit (Strict)
        run: accessjet check --fail-on moderate https://myapp.com
```

## 🚀 Installation & Usage

```bash
npm install -g accessjet
```

### Basic Scan

```bash
accessjet check https://example.com
```

### High Concurrency

```bash
accessjet check -c 10 https://site1.com https://site2.com
```

### CI/CD Strict Mode

```bash
accessjet check --fail-on critical https://myapp.com
```

### Full JSON Report

```bash
accessjet check -j https://example.com
```

### Options

```
Usage: accessjet check [options] <urls...>

Options:
  -c, --concurrency <number>  Concurrency level (default: "5")
  -j, --json                  Output full JSON report to report.json
  -f, --fail-on <level>       Minimum impact level to fail the build
                              (minor, moderate, serious, critical) (default: "moderate")
  -h, --help                  Display help for command
```

## 🛠️ Development

```bash
git clone https://github.com/berkinduz/access-jet.git
cd access-jet
npm install
npm run build
npm run generate-demo  # Generate demo SVG
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built for developers who demand both speed and accuracy in accessibility compliance.**
