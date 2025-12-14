import pLimit from "p-limit";
import { BrowserEngine } from "./BrowserEngine";
import { PageScanner } from "./PageScanner";

export interface ScanResult {
  url: string;
  violations?: any[];
  error?: string;
}

export class BatchRunner {
  async run(urls: string[], concurrency: number = 5): Promise<ScanResult[]> {
    const engine = BrowserEngine.getInstance();
    await engine.init();

    const context = await engine.getContext();
    const scanner = new PageScanner(context);

    const limit = pLimit(concurrency);

    const promises = urls.map((url) =>
      limit(async (): Promise<ScanResult> => {
        try {
          return await scanner.scanUrl(url);
        } catch (error) {
          return {
            url,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    const results = await Promise.all(promises);

    await context.close();
    await engine.close();

    return results;
  }
}
