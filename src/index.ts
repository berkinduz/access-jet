import { BrowserEngine } from "./core/BrowserEngine";

async function main() {
  const engine = BrowserEngine.getInstance();
  await engine.init();
  console.log("Browser initialized successfully");

  // Test getContext
  const context = await engine.getContext();
  console.log("Context created");
  await context.close();

  await engine.close();
  console.log("Browser closed");
}

main().catch(console.error);
