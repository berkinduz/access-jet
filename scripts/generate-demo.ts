import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

async function generateDemo() {
  try {
    console.log("🚀 Running AccessJet demo scan...");

    // Run the CLI command and capture output
    const { stdout } = await execAsync(
      "node dist/cli.js check https://example.com --fail-on critical || true",
      {
        cwd: path.join(__dirname, ".."),
        maxBuffer: 1024 * 1024, // 1MB buffer
      }
    );

    console.log("✅ Scan completed, creating simple demo image...");

    // Strip ANSI escape codes from output
    const cleanOutput = stdout.replace(/\x1B\[[0-9;]*[mG]/g, '');

    // Create a simple SVG with the output as plain text
    const lines = cleanOutput.split('\n').slice(0, 12); // Take first 12 lines
    const svgHeight = lines.length * 20 + 40;

    const svgContent = `<svg width="800" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1e1e1e" rx="8"/>
      <text x="20" y="30" fill="#00ff00" font-family="Monaco, monospace" font-size="14">
        ${lines.map(line => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('&#10;')}
      </text>
    </svg>`;

    // Save to assets/demo.svg
    const outputPath = path.join(__dirname, "..", "assets", "demo.svg");
    fs.writeFileSync(outputPath, svgContent);

    console.log(`🎨 Simple demo SVG generated at ${outputPath}`);

  } catch (error) {
    console.error("❌ Error generating demo:", error);
    process.exit(1);
  }
}

generateDemo();