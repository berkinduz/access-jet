#!/usr/bin/env node

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import Table from "cli-table3";
import { BatchRunner } from "./core/BatchRunner";
import * as fs from "fs";
import prettier from "prettier";
import highlight from "cli-highlight";

const program = new Command();

program
  .name("accessjet")
  .description("Blazing fast accessibility auditing CLI")
  .version("1.0.0");

program
  .command("check <urls...>")
  .description("Check accessibility of URLs")
  .option("-c, --concurrency <number>", "concurrency level", "5")
  .option("-j, --json", "output full JSON report to report.json")
  .option(
    "-f, --fail-on <level>",
    "Minimum impact level to fail the build (minor, moderate, serious, critical)",
    "moderate"
  )
  .action(async (urls: string[], options) => {
    const spinner = ora("🚀 AccessJet initializing...").start();

    const concurrency = parseInt(options.concurrency, 10);
    const failOnLevel = options.failOn;

    // Define impact hierarchy (from lowest to highest severity)
    const impactLevels = ["minor", "moderate", "serious", "critical"];

    // Validate fail-on level
    if (!impactLevels.includes(failOnLevel)) {
      console.error(chalk.red(`❌ Invalid fail-on level: ${failOnLevel}`));
      console.error(chalk.yellow(`Valid levels: ${impactLevels.join(", ")}`));
      process.exit(1);
    }

    const runner = new BatchRunner();

    spinner.text = `Scanning ${urls.length} URLs with concurrency ${concurrency}...`;

    const results = await runner.run(urls, concurrency);

    spinner.succeed("Scanning completed");

    // Create and display summary table
    const table = new Table({
      head: [
        chalk.cyan("URL"),
        chalk.cyan("Status"),
        chalk.cyan("Violations"),
        chalk.cyan("Critical"),
      ],
      colWidths: [50, 10, 15, 15],
    });

    let totalViolations = 0;
    results.forEach((result) => {
      const status = result.error ? chalk.red("❌") : chalk.green("✅");
      const violations = result.violations ? result.violations.length : 0;
      const critical = result.violations
        ? result.violations.filter((v: any) => v.impact === "critical").length
        : 0;
      table.push([result.url, status, violations, critical]);
      totalViolations += violations;
    });

    console.log(table.toString());

    if (options.json) {
      fs.writeFileSync("report.json", JSON.stringify(results, null, 2));
      console.log(chalk.blue("Full report saved to report.json"));
    }

    // Detailed violation logs
    if (totalViolations > 0) {
      console.log(chalk.bold("\nDetailed Violation Logs:\n"));

      // Group violations by impact
      const impactOrder = ["critical", "serious", "moderate", "minor"];

      for (const result of results) {
        if (result.violations && result.violations.length > 0) {
          console.log(chalk.blue(`Build Errors for ${result.url}:`));

          // Group by impact
          const groupedViolations = result.violations.reduce(
            (acc: any, violation: any) => {
              if (!acc[violation.impact]) acc[violation.impact] = [];
              acc[violation.impact].push(violation);
              return acc;
            },
            {}
          );

          for (const impact of impactOrder) {
            if (groupedViolations[impact]) {
              for (const violation of groupedViolations[impact]) {
                await printViolationBlock(violation);
              }
            }
          }
        }
      }
    }

    // Implement threshold-based exit logic
    const thresholdIndex = impactLevels.indexOf(failOnLevel);

    // Find maximum impact level across all violations
    let maxImpactIndex = -1;
    for (const result of results) {
      if (result.violations && result.violations.length > 0) {
        for (const violation of result.violations) {
          const violationIndex = impactLevels.indexOf(violation.impact);
          if (violationIndex > maxImpactIndex) {
            maxImpactIndex = violationIndex;
          }
        }
      }
    }

    // Determine exit code based on threshold
    const shouldFail = maxImpactIndex >= thresholdIndex;
    const exitCode = shouldFail ? 1 : 0;

    if (totalViolations > 0) {
      const maxImpact =
        maxImpactIndex >= 0 ? impactLevels[maxImpactIndex] : "none";
      const threshold = failOnLevel;
      console.log(
        chalk.gray(
          `\nFound ${totalViolations} violations with max impact: ${chalk.bold(maxImpact)}`
        )
      );
      console.log(chalk.gray(`Fail threshold: ${chalk.bold(threshold)}`));

      if (shouldFail) {
        console.log(
          chalk.red(
            `❌ Build failed due to accessibility violations exceeding threshold`
          )
        );
      } else {
        console.log(
          chalk.yellow(
            `⚠️  Accessibility violations found but below threshold - build continues`
          )
        );
      }
    } else {
      console.log(chalk.green(`✅ No accessibility violations found`));
    }

    process.exit(exitCode);
  });

async function printViolationBlock(violation: any) {
  const impactColor = getImpactColor(violation.impact);
  const impactLabel = violation.impact.toUpperCase();

  console.log(chalk.gray("─".repeat(64)));
  console.log(
    `${impactColor(`[${impactLabel}]`)} ${chalk.white(violation.id)} ${chalk.gray(`(${violation.description})`)}`
  );

  if (violation.helpUrl) {
    console.log(`🔗 ${chalk.blue("Help:")} ${violation.helpUrl}`);
  }

  // Show nodes with code snippets
  const maxNodes = 5;
  const nodesToShow = violation.nodes.slice(0, maxNodes);
  const remaining = violation.nodes.length - maxNodes;

  for (const [index, node] of nodesToShow.entries()) {
    const selector = node.target && node.target[0] ? node.target[0] : "N/A";
    console.log(`${chalk.yellow("Selector:")} ${chalk.white(selector)}`);

    if (node.html) {
      const formattedSnippet = await getFormattedSnippet(
        node.html,
        node.target
      );
      const highlighted = highlight(formattedSnippet, {
        language: "html",
        ignoreIllegals: true,
      });
      console.log(`${chalk.cyan("Code:")}\n${highlighted}`);
    }

    if (node.failureSummary) {
      console.log(`${chalk.red("Hint:")} ${node.failureSummary}`);
    }

    // Add spacing between nodes
    if (index < nodesToShow.length - 1) {
      console.log();
    }
  }

  if (remaining > 0) {
    console.log(chalk.gray(`...and ${remaining} more instances`));
  }

  console.log(); // Extra line after each violation
}

function getImpactColor(impact: string): any {
  switch (impact) {
    case "critical":
      return chalk.red.bold;
    case "serious":
      return chalk.red;
    case "moderate":
      return chalk.yellow;
    case "minor":
      return chalk.blue;
    default:
      return chalk.white;
  }
}

function syntaxHighlightHtml(html: string): string {
  // Simple HTML syntax highlighting
  return html
    .replace(/(&lt;\/?[\w\s="'-]+&gt;)/g, chalk.cyan("$1")) // Tags
    .replace(
      /(class|id|src|href|alt|title)="([^"]*)"/g,
      `$1=${chalk.yellow('"$2"')}`
    ) // Attributes
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, chalk.gray("$1")); // Comments
}

async function getFormattedSnippet(
  html: string,
  target: string[]
): Promise<string> {
  if (!html || !target || target.length === 0) {
    return chalk.gray("No HTML source available");
  }

  const selector = target[0].toLowerCase();

  // Rule 1: Container Guard - Never show full content for page-level elements
  if (
    selector === "html" ||
    selector === "body" ||
    selector === "head" ||
    selector.includes("iframe") ||
    selector.includes("frame")
  ) {
    // Extract just the opening tag with attributes
    const tagMatch = html.match(/^<(\w+)([^>]*)>/);
    if (tagMatch) {
      const tagName = tagMatch[1];
      const attributes = tagMatch[2];
      const closingTag = `</${tagName}>`;
      return `<${tagName}${attributes}>${closingTag}`;
    }
    return `<${selector}>...</${selector}>`;
  }

  // Rule 2: Prettify for other elements
  try {
    const formatted = await prettier.format(html, {
      parser: "html",
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: false,
      singleQuote: false,
      quoteProps: "as-needed",
      trailingComma: "none",
      bracketSpacing: true,
      bracketSameLine: false,
      arrowParens: "avoid",
    });

    // Rule 3: Truncate to 10 lines
    const lines = formatted.trim().split("\n");
    if (lines.length > 10) {
      const truncated = lines.slice(0, 10).join("\n") + "\n... (truncated)";
      return truncated;
    }

    return formatted.trim();
  } catch (error) {
    // Fallback to original HTML if formatting fails
    const lines = html.split("\n");
    if (lines.length > 10) {
      return lines.slice(0, 10).join("\n") + "\n... (truncated)";
    }
    return html;
  }
}

program.parse();
