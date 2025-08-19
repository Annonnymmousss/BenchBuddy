import * as vscode from "vscode";
import { runBenchmark, BenchConfig, BenchResultView } from "./bench";

export function activate(context: vscode.ExtensionContext) {
  // Register the dashboard command
  const disposable = vscode.commands.registerCommand("benchbuddy.openDashboard", () => {
    const panel = vscode.window.createWebviewPanel(
      "benchbuddy",
      "BenchBuddy",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    const html = getHtml(context, panel.webview);
    panel.webview.html = html;

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.type === "run") {
        try {
          const cfg = msg.payload as BenchConfig;
          cfg.url = expandEnv(cfg.url);
          if (cfg.headers) {
            Object.keys(cfg.headers).forEach(k => (cfg.headers![k] = expandEnv(cfg.headers![k])));
          }
          if (cfg.body) cfg.body = expandEnv(cfg.body);

          panel.webview.postMessage({ type: "status", text: "Running..." });
          const result = await runBenchmark(cfg);
          const summary: BenchResultView = {
            url: cfg.url,
            method: cfg.method,
            requestsPerSec: result.requests?.average ?? 0,
            totalRequests: result.requests?.sent ?? 0,
            errors: result.errors ?? 0,
            timeouts: (result as any).timeouts ?? 0,
            throughputBps: result.throughput?.average ?? 0,
            latency: {
              average: result.latency?.average,
              p50: (result.latency as any)?.p50 ?? (result.latency as any)?.["50"],
              p75: (result.latency as any)?.p75 ?? (result.latency as any)?.["75"],
              p90: (result.latency as any)?.p90 ?? (result.latency as any)?.["90"],
              p95: (result.latency as any)?.p95 ?? (result.latency as any)?.["95"],
              p99: (result.latency as any)?.p99 ?? (result.latency as any)?.["99"]
            },
            statusBuckets: {
              "2xx": (result as any)["2xx"] ?? 0,
              "3xx": (result as any)["3xx"] ?? 0,
              "4xx": (result as any)["4xx"] ?? 0,
              "5xx": (result as any)["5xx"] ?? 0,
              non2xx: (result as any)["non2xx"] ?? 0
            }
          };
          panel.webview.postMessage({ type: "done", result: summary, raw: result });
        } catch (e: any) {
          panel.webview.postMessage({ type: "error", error: String(e?.message ?? e) });
        }
      }
    });
  });

  // Add Status Bar button
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = "benchbuddy.openDashboard";
  statusBar.text = "🚀 BenchBuddy";
  statusBar.tooltip = "Open BenchBuddy Dashboard";
  statusBar.show();

  context.subscriptions.push(disposable, statusBar);
}

function getHtml(context: vscode.ExtensionContext, webview: vscode.Webview) {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "script.js")
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "style.css")
  );
  const chartJs = "https://cdn.jsdelivr.net/npm/chart.js";
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-xyz' ${chartJs}`,
    "style-src 'unsafe-inline'",
    "img-src data:",
    "font-src data:",
    "connect-src 'self'"
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BenchBuddy</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="app"></div>
  <script nonce="xyz" src="${chartJs}"></script>
  <script nonce="xyz" src="${scriptUri}"></script>
</body>
</html>`;
}

function expandEnv(s: string) {
  return s.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name) => process.env[name] ?? "");
}

export function deactivate() {}
