import { AxeBuilder } from "@axe-core/playwright";
import { BrowserContext, Page } from "playwright";
import { ScanResult } from "./BatchRunner";

export class PageScanner {
  private context: BrowserContext;

  constructor(context: BrowserContext) {
    this.context = context;
  }

  async scanUrl(url: string): Promise<ScanResult> {
    const page = await this.context.newPage();

    try {
      // Speed Optimization 1: Block resource types that are not needed for a11y checks
      await page.route("**/*", (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        if (["image", "media", "font"].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // Speed Optimization 2: Navigate with minimal wait
      await page.goto(url, { waitUntil: "domcontentloaded" });

      // Speed Optimization 3: Disable CSS transitions and animations
      await page.addStyleTag({
        content:
          "* { transition: none !important; animation: none !important; }",
      });

      // Analyze the page with Axe
      const axeBuilder = new AxeBuilder({ page });
      const results = await axeBuilder.analyze();

      if (results.violations.length > 0) {
        // Capture HTML source for failing elements
        for (const violation of results.violations) {
          for (const node of violation.nodes) {
            if (
              node.target &&
              node.target[0] &&
              typeof node.target[0] === "string"
            ) {
              try {
                const elementHandle = page.locator(node.target[0]).first();
                // Capture HTML source
                const html = await elementHandle.evaluate((el) => el.outerHTML);
                (node as any).html = html;
              } catch (error) {
                // Ignore errors for elements that can't be located
                (node as any).html = null;
              }
              // Always capture failure summary
              (node as any).failureSummary = node.failureSummary;
            }
          }
        }
      }

      return {
        url,
        violations: results.violations,
      };
    } finally {
      // Ensure page is closed to prevent memory leaks
      await page.close();
    }
  }
}
