import * as vscode from "vscode";
import { runBenchmark, BenchConfig, BenchResultView } from "./bench";

export function activate(context: vscode.ExtensionContext) {
  // Register the dashboard command
  const disposable = vscode.commands.registerCommand("benchbuddy.openDashboard", () => {
    const panel = vscode.window.createWebviewPanel(
      "benchbuddy",
      "🚀 BenchBuddy",
      vscode.ViewColumn.One,
      { 
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media')
        ]
      }
    );

    const html = getHtml(context, panel.webview);
    panel.webview.html = html;

    // Enhanced message handling with better error reporting
    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.type === "run") {
        try {
          const cfg = msg.payload as BenchConfig;
          
          // Validate configuration
          if (!cfg.url || !cfg.url.trim()) {
            panel.webview.postMessage({ 
              type: "error", 
              error: "URL is required and cannot be empty" 
            });
            return;
          }

          // Expand environment variables
          cfg.url = expandEnv(cfg.url);
          if (cfg.headers) {
            Object.keys(cfg.headers).forEach(k => {
              if (cfg.headers![k]) {
                cfg.headers![k] = expandEnv(cfg.headers![k]);
              }
            });
          }
          if (cfg.body) {
            cfg.body = expandEnv(cfg.body);
          }

          // Validate URL format
          try {
            new URL(cfg.url);
          } catch {
            panel.webview.postMessage({ 
              type: "error", 
              error: "Invalid URL format. Please enter a valid HTTP/HTTPS URL" 
            });
            return;
          }

          // Send status updates
          panel.webview.postMessage({ type: "status", text: "Initializing benchmark..." });
          
          // Add a small delay to show the loading state
          await new Promise(resolve => setTimeout(resolve, 500));
          
          panel.webview.postMessage({ type: "status", text: "Running benchmark..." });
          
          const result = await runBenchmark(cfg);
          
          // Process and enhance results
          const summary: BenchResultView = {
            url: cfg.url,
            method: cfg.method,
            requestsPerSec: Number((result.requests?.average ?? 0).toFixed(2)),
            totalRequests: result.requests?.sent ?? 0,
            errors: result.errors ?? 0,
            timeouts: (result as any).timeouts ?? 0,
            throughputBps: result.throughput?.average ?? 0,
            latency: {
              average: result.latency?.average ? Number(result.latency.average.toFixed(2)) : undefined,
              p50: (result.latency as any)?.p50 ?? (result.latency as any)?.["50"] ?? 0,
              p75: (result.latency as any)?.p75 ?? (result.latency as any)?.["75"] ?? 0,
              p90: (result.latency as any)?.p90 ?? (result.latency as any)?.["90"] ?? 0,
              p95: (result.latency as any)?.p95 ?? (result.latency as any)?.["95"] ?? 0,
              p99: (result.latency as any)?.p99 ?? (result.latency as any)?.["99"] ?? 0
            },
            statusBuckets: {
              "2xx": (result as any)["2xx"] ?? 0,
              "3xx": (result as any)["3xx"] ?? 0,
              "4xx": (result as any)["4xx"] ?? 0,
              "5xx": (result as any)["5xx"] ?? 0,
              non2xx: (result as any)["non2xx"] ?? 0
            }
          };

          // Show completion notification in VSCode
          vscode.window.showInformationMessage(
            `Benchmark completed! ${summary.requestsPerSec} req/sec`,
            "View Results"
          ).then(selection => {
            if (selection === "View Results") {
              panel.reveal();
            }
          });

          panel.webview.postMessage({ 
            type: "done", 
            result: summary, 
            raw: result 
          });
          
        } catch (e: any) {
          console.error("Benchmark error:", e);
          
          let errorMessage = "An unexpected error occurred during benchmarking";
          
          if (e?.message) {
            errorMessage = e.message;
          } else if (typeof e === 'string') {
            errorMessage = e;
          }
          
          // Show error in VSCode
          vscode.window.showErrorMessage(`BenchBuddy Error: ${errorMessage}`);
          
          panel.webview.postMessage({ 
            type: "error", 
            error: errorMessage 
          });
        }
      }
    });

    // Handle panel disposal
    panel.onDidDispose(() => {
      // Clean up resources if needed
    });
  });

  // Enhanced Status Bar with better styling
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = "benchbuddy.openDashboard";
  statusBar.text = "🚀 BenchBuddy";
  statusBar.tooltip = "Open BenchBuddy Dashboard - API Benchmarking Tool";
  statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
  statusBar.show();

  // Add context menu commands
  const contextCommand = vscode.commands.registerCommand("benchbuddy.benchmarkUrl", (uri) => {
    vscode.commands.executeCommand("benchbuddy.openDashboard");
  });

  context.subscriptions.push(disposable, statusBar, contextCommand);
}

function getHtml(context: vscode.ExtensionContext, webview: vscode.Webview) {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "script.js")
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "style.css")
  );
  
  // Use Chart.js from CDN with integrity check
  const chartJs = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js";
  
  // Enhanced Content Security Policy
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-benchbuddy-${Date.now()}' ${chartJs} 'unsafe-eval'`,
    "style-src 'unsafe-inline' 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:"
  ].join("; ");

  const nonce = `benchbuddy-${Date.now()}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BenchBuddy - API Benchmarking Tool</title>
  <link rel="stylesheet" href="${styleUri}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${chartJs}" integrity="sha384-vx/1qx2YKwMTJzW0s6gPk5PZOzCYaE4B8V3z3S2jZw3YGYFo9p6M9w4iK1Q+5h5l" crossorigin="anonymous"></script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function expandEnv(s: string): string {
  if (!s) return s;
  
  return s.replace(/\$\{([A-Z0-9_]+)\}/g, (match, name) => {
    const value = process.env[name];
    if (value === undefined) {
      console.warn(`Environment variable ${name} is not defined`);
      return match;
    }
    return value;
  });
}

export function deactivate() {
  // Clean up any resources
}