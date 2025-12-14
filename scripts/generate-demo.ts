import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
const ansiToSvg = require("ansi-to-svg");

const execAsync = promisify(exec);

async function generateDemo() {
  try {
    console.log("🚀 Running AccessJet demo scan...");

    // Run the CLI command and capture output
    const { stdout } = await execAsync(
      "node dist/cli.js check https://example.com || true",
      {
        cwd: path.join(__dirname, ".."),
        maxBuffer: 1024 * 1024, // 1MB buffer
      }
    );

    console.log("✅ Scan completed, converting to SVG...");

    // Convert ANSI output to SVG with dark terminal styling
    const svg = ansiToSvg(stdout, {
      fontFamily:
        'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        black: "#000000",
        red: "#f44747",
        green: "#6a9955",
        yellow: "#dcdcaa",
        blue: "#4fc1ff",
        magenta: "#c586c0",
        cyan: "#4ec9b0",
        white: "#d4d4d4",
        brightBlack: "#808080",
        brightRed: "#f44747",
        brightGreen: "#6a9955",
        brightYellow: "#dcdcaa",
        brightBlue: "#4fc1ff",
        brightMagenta: "#c586c0",
        brightCyan: "#4ec9b0",
        brightWhite: "#ffffff",
      },
      padding: "20px",
      width: 800,
      height: "auto",
    });

    // Add terminal window styling
    const styledSvg = svg.replace(
      "<svg",
      `<svg style="border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);"`
    );

    // Save to assets/demo.svg
    const outputPath = path.join(__dirname, "..", "assets", "demo.svg");
    fs.writeFileSync(outputPath, styledSvg);

    console.log(`🎨 Demo SVG generated at ${outputPath}`);
  } catch (error) {
    console.error("❌ Error generating demo:", error);
    process.exit(1);
  }
}

generateDemo();
