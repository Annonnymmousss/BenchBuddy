const vscode = acquireVsCodeApi();

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v);
  });
  children.forEach(c => el.appendChild(c));
  return el;
}

function kvRow(k = "", v = "") {
  const row = h("div", { class: "kv" }, [
    h("input", { placeholder: "Header name", value: k }),
    h("input", { placeholder: "Header value", value: v }),
    h("button", { class: "btn ghost", text: "✕", type: "button" })
  ]);
  
  row.querySelector("button").onclick = () => {
    row.style.transform = "translateX(-100%)";
    row.style.opacity = "0";
    setTimeout(() => row.remove(), 300);
  };
  
  // Add slide-in animation
  row.style.opacity = "0";
  row.style.transform = "translateY(-10px)";
  setTimeout(() => {
    row.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    row.style.opacity = "1";
    row.style.transform = "translateY(0)";
  }, 10);
  
  return row;
}

function showNotification(message, type = 'info') {
  const notification = h("div", {
    class: `notification ${type}`,
    style: `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ${type === 'success' ? 'background: var(--success);' : ''}
      ${type === 'error' ? 'background: var(--error);' : ''}
      ${type === 'info' ? 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' : ''}
    `,
    text: message
  });
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 10);
  
  setTimeout(() => {
    notification.style.transform = "translateX(100%)";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function app() {
  const root = document.getElementById("app");
  const wrapper = h("div", { class: "wrapper fade-in" });

  // LEFT: Enhanced form panel
  const formCard = h("div", { class: "card" });
  formCard.appendChild(h("h1", { text: "🚀 BenchBuddy" }));

  const form = h("form");
  
  // URL input group
  const urlGroup = h("div", { class: "form-group" });
  urlGroup.innerHTML = `
    <label>🎯 Target URL</label>
    <input required name="url" placeholder="https://api.example.com/endpoint" type="url"/>
  `;

  // Method and connections row
  const methodRow = h("div", { class: "row" });
  methodRow.innerHTML = `
    <div class="form-group">
      <label>⚡ Method</label>
      <select name="method">
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>PATCH</option>
        <option>DELETE</option>
      </select>
    </div>
    <div class="form-group">
      <label>🔗 Connections</label>
      <input type="number" name="connections" value="10" min="1" max="1000"/>
    </div>
  `;

  // Duration and amount row
  const durationRow = h("div", { class: "row" });
  durationRow.innerHTML = `
    <div class="form-group">
      <label>⏱️ Duration (seconds)</label>
      <input type="number" name="duration" value="10" min="0" max="300"/>
    </div>
    <div class="form-group">
      <label>📊 Total Requests</label>
      <input type="number" name="amount" value="0" min="0" placeholder="0 = unlimited"/>
    </div>
  `;

  // Headers section
  const headersSection = h("div", { class: "header-section" });
  const headersLabel = h("label", { text: "🔧 Request Headers" });
  const headersDiv = h("div", { id: "headers" });
  const headerControls = h("div", { class: "header-controls" });
  
  const addHeaderBtn = h("button", { 
    type: "button", 
    id: "addHeader", 
    class: "btn ghost",
    text: "+ Custom Header"
  });
  
  const addTokenBtn = h("button", { 
    type: "button", 
    id: "addToken", 
    class: "btn ghost",
    text: "+ Bearer Token"
  });
  
  headerControls.appendChild(addHeaderBtn);
  headerControls.appendChild(addTokenBtn);
  headersSection.appendChild(headersLabel);
  headersSection.appendChild(headersDiv);
  headersSection.appendChild(headerControls);

  // Body section
  const bodyGroup = h("div", { class: "form-group" });
  bodyGroup.innerHTML = `
    <label>📝 Request Body</label>
    <textarea name="body" placeholder='{"key": "value", "data": "example"}'></textarea>
  `;

  // Action buttons
  const buttonGroup = h("div", { class: "btn-group" });
  const runBtn = h("button", { type: "submit", class: "btn", text: "🚀 Run Benchmark" });
  const resetBtn = h("button", { type: "button", id: "reset", class: "btn ghost", text: "🔄 Reset" });
  buttonGroup.appendChild(runBtn);
  buttonGroup.appendChild(resetBtn);

  // Assemble form
  form.appendChild(urlGroup);
  form.appendChild(methodRow);
  form.appendChild(durationRow);
  form.appendChild(headersSection);
  form.appendChild(bodyGroup);
  form.appendChild(buttonGroup);

  // Event handlers
  addHeaderBtn.onclick = () => headersDiv.appendChild(kvRow());
  addTokenBtn.onclick = () => headersDiv.appendChild(kvRow("Authorization", "Bearer "));
  
  resetBtn.onclick = () => {
    headersDiv.innerHTML = "";
    form.reset();
    showNotification("Form reset successfully!", 'info');
  };

  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const headers = {};
    
    [...headersDiv.querySelectorAll(".kv")].forEach(row => {
      const k = row.children[0].value.trim();
      const v = row.children[1].value;
      if (k) headers[k] = v;
    });
    
    const payload = {
      url: fd.get("url"),
      method: fd.get("method"),
      connections: Number(fd.get("connections") || 10),
      duration: Number(fd.get("duration") || 0),
      amount: Number(fd.get("amount") || 0),
      headers,
      body: String(fd.get("body") || "")
    };
    
    if (!payload.url) {
      showNotification("Please enter a valid URL!", 'error');
      return;
    }
    
    setStatus("Running", true);
    showNotification("Benchmark started!", 'info');
    vscode.postMessage({ type: "run", payload });
  };

  formCard.appendChild(form);

  // RIGHT: Enhanced results panel
  const resCard = h("div", { class: "card" });
  
  // Status display
  const statusDisplay = h("div", { class: "status-display", id: "statusDisplay" });
  statusDisplay.innerHTML = `
    <div class="label">System Status</div>
    <div class="value" id="status">🟢 Ready to benchmark</div>
  `;
  resCard.appendChild(statusDisplay);

  // Metrics grid
  const metrics = h("div", { class: "metrics" });
  metrics.innerHTML = `
    <div class="metric">
      <div class="label">Requests/sec</div>
      <div class="value" id="m_rps">—</div>
    </div>
    <div class="metric">
      <div class="label">Throughput</div>
      <div class="value" id="m_tps">— KB/s</div>
    </div>
    <div class="metric">
      <div class="label">Success Rate</div>
      <div class="value" id="m_ok">—</div>
    </div>
    <div class="metric">
      <div class="label">Failures</div>
      <div class="value" id="m_fail">—</div>
    </div>
  `;
  resCard.appendChild(metrics);

  // Charts section
  const latencyChartContainer = h("div", { class: "chart-container" });
  const latencyCanvas = h("canvas", { id: "latChart", height: "160" });
  latencyChartContainer.appendChild(latencyCanvas);
  resCard.appendChild(latencyChartContainer);

  const rpsChartContainer = h("div", { class: "chart-container" });
  const rpsCanvas = h("canvas", { id: "rpsChart", height: "140" });
  rpsChartContainer.appendChild(rpsCanvas);
  resCard.appendChild(rpsChartContainer);

  // Percentiles table
  const percTitle = h("h3", { text: "📈 Response Time Percentiles" });
  resCard.appendChild(percTitle);

  const percTable = h("table");
  percTable.innerHTML = `
    <thead><tr><th>p50</th><th>p75</th><th>p90</th><th>p95</th><th>p99</th></tr></thead>
    <tbody><tr>
      <td id="p50">—</td><td id="p75">—</td><td id="p90">—</td><td id="p95">—</td><td id="p99">—</td>
    </tr></tbody>
  `;
  resCard.appendChild(percTable);

  // Status codes table
  const codeTitle = h("h3", { text: "📋 HTTP Status Distribution" });
  resCard.appendChild(codeTitle);

  const codeTable = h("table");
  codeTable.innerHTML = `
    <thead><tr><th>Status Range</th><th>Count</th></tr></thead>
    <tbody id="codes"></tbody>
  `;
  resCard.appendChild(codeTable);

  wrapper.appendChild(formCard);
  wrapper.appendChild(resCard);
  root.appendChild(wrapper);

  // Enhanced Charts with better styling
  let latChart, rpsChart;
  
  function drawCharts(result) {
    const latCtx = document.getElementById("latChart").getContext("2d");
    const rpsCtx = document.getElementById("rpsChart").getContext("2d");

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutCubic'
      },
      plugins: {
        legend: {
          labels: {
            color: '#ffffff',
            font: { family: 'Inter', size: 12, weight: '600' }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#9ca3af' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        y: {
          ticks: { color: '#9ca3af' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    };

    const p = result.latency || {};
    const latData = [
      p.average ?? 0,
      p.p50 ?? 0,
      p.p75 ?? 0,
      p.p90 ?? 0,
      p.p95 ?? 0,
      p.p99 ?? 0
    ];
    const latLabels = ["avg", "p50", "p75", "p90", "p95", "p99"];

    if (latChart) latChart.destroy();
    latChart = new Chart(latCtx, {
      type: "bar",
      data: {
        labels: latLabels,
        datasets: [{
          label: "Latency (ms)",
          data: latData,
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: chartOptions
    });

    if (rpsChart) rpsChart.destroy();
    rpsChart = new Chart(rpsCtx, {
      type: "doughnut",
      data: {
        labels: ["Requests/sec"],
        datasets: [{
          label: "Performance",
          data: [result.requestsPerSec ?? 0, Math.max(0, 100 - (result.requestsPerSec ?? 0))],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(55, 65, 81, 0.3)'
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(55, 65, 81, 0.5)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        ...chartOptions,
        cutout: '60%',
        plugins: {
          ...chartOptions.plugins,
          legend: { display: false }
        }
      }
    });
  }

  function setStatus(text, isRunning = false) {
    const statusEl = document.getElementById("status");
    const statusDisplay = document.getElementById("statusDisplay");
    
    statusEl.textContent = text;
    
    if (isRunning) {
      statusDisplay.classList.add("running", "loading");
      statusEl.textContent = "🔄 " + text;
    } else {
      statusDisplay.classList.remove("running", "loading");
      if (text.includes("Error")) {
        statusEl.textContent = "❌ " + text;
      } else if (text.includes("Done")) {
        statusEl.textContent = "✅ " + text;
      } else {
        statusEl.textContent = "🟢 " + text;
      }
    }
  }

  function animateValue(element, start, end, duration = 1000) {
    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = start + (end - start) * progress;
      
      if (element.id.includes('rps') || element.id.includes('tps')) {
        element.textContent = current.toFixed(2) + (element.id.includes('tps') ? ' KB/s' : '');
      } else {
        element.textContent = Math.round(current).toString();
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  // Enhanced message handling
  window.addEventListener("message", (e) => {
    const msg = e.data;
    
    if (msg.type === "status") {
      setStatus(msg.text, true);
    }
    
    if (msg.type === "error") {
      setStatus("Error occurred");
      showNotification(msg.error || "An error occurred during benchmarking", 'error');
    }
    
    if (msg.type === "done") {
      setStatus("Benchmark completed");
      showNotification("Benchmark completed successfully!", 'success');
      
      const r = msg.result;

      // Animate metrics
      const rpsEl = document.getElementById("m_rps");
      const tpsEl = document.getElementById("m_tps");
      const okEl = document.getElementById("m_ok");
      const failEl = document.getElementById("m_fail");

      animateValue(rpsEl, 0, r.requestsPerSec ?? 0);
      animateValue(tpsEl, 0, (r.throughputBps ?? 0) / 1024);

      const ok = Number(r.statusBuckets?.["2xx"] ?? 0);
      const failures = Number(r.errors ?? 0) + Number(r.timeouts ?? 0) + Number(r.statusBuckets?.non2xx ?? 0);
      
      animateValue(okEl, 0, ok);
      animateValue(failEl, 0, failures);

      // Update percentiles with animation
      const p = r.latency || {};
      const percentiles = ['p50', 'p75', 'p90', 'p95', 'p99'];
      percentiles.forEach(perc => {
        const el = document.getElementById(perc);
        const value = p[perc] ?? 0;
        animateValue(el, 0, value);
      });

      // Update status codes table
      const tbody = codeTable.querySelector("#codes");
      tbody.innerHTML = "";
      Object.entries(r.statusBuckets || {}).forEach(([k, v]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${k}</td><td>${v}</td>`;
        tr.style.opacity = "0";
        tbody.appendChild(tr);
        
        setTimeout(() => {
          tr.style.transition = "opacity 0.3s ease";
          tr.style.opacity = "1";
        }, 100);
      });

      // Draw charts with delay for better UX
      setTimeout(() => {
        drawCharts(r);
      }, 500);
      
      console.log("Benchmark results:", msg.raw);
    }
  });
}

document.addEventListener("DOMContentLoaded", app);