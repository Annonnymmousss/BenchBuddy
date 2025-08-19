# BenchBuddy ⚡

**BenchBuddy** is a Visual Studio Code extension that lets you benchmark APIs directly from your editor using [Autocannon](https://github.com/mcollina/autocannon).
No need to leave VS Code — test performance, analyze results, and iterate faster.

---

## ✨ Features

* 📊 **Dashboard UI** – Run and view benchmarks inside a VS Code webview panel.
* ⚡ **Powered by Autocannon** – Production-grade load testing engine.
* 🛠️ **Configurable Benchmarks** – Set URL, duration, concurrency, and rate limits.
* 📈 **Result Visualization** – View latency stats, requests per second, throughput, and errors.
* 🔄 **One-click Reruns** – Quickly tweak parameters and re-run tests.
* 🔒 **Secure Webview** – CSP with nonces to prevent script injection.

---

## 🚀 Getting Started

### 1. Install

Clone this repo and install dependencies:

```bash
git clone https://github.com/your-username/benchbuddy.git
cd benchbuddy
npm install
```

### 2. Build

Compile TypeScript:

```bash
npm run compile
```

### 3. Run in VS Code

* Open the project in VS Code.
* Press `F5` to launch a new Extension Development Host window.
* Run the command:
  **`BenchBuddy: Open Dashboard`**

---

## ⚙️ Usage

1. Open the dashboard from the VS Code **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Enter benchmark settings:

   * **URL** – API endpoint to test
   * **Duration** – How long to run (seconds)
   * **Threads** – Concurrent workers
   * **Rate Limit** – Max requests per second per thread
3. Click **Run Benchmark**.
4. Results will appear inside the dashboard.

---

## 📊 Example Output

```json
{
  "url": "http://localhost:3000/api",
  "duration": 10,
  "threads": 2,
  "rateLimit": 50,
  "requests": {
    "average": 500,
    "p95": 800
  },
  "latency": {
    "average": 20,
    "p95": 40
  }
}
```

---

## 🛠️ Development

### Commands

* `npm run compile` – Compile TypeScript.
* `npm run watch` – Watch mode for active development.
* `npm run test` – Run extension tests.

### Project Structure

```
│── .vscode/
│   └── launch.json
│── media/                 #UI
│   ├── style.css
│   └── script.js
├── src/
│   ├── extension.ts       # VS Code activation + webview setup
│   ├── bench.ts           # Autocannon wrapper & benchmark logic
├── package.json           # Extension manifest
└── tsconfig.json          # TypeScript config
│── global.d.ts

```

---

## 📦 Publishing

To package & publish on the [VS Code Marketplace](https://code.visualstudio.com/api/working-with-extensions/publishing-extension):

```bash
npm install -g vsce
vsce package
vsce publish
```

---


## 📝 License

MIT License © 2025 \[Your Name]
Built with ❤️ for developers who love speed.

---
