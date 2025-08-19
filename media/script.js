const vscode = acquireVsCodeApi();

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v);
  });
  children.forEach(c => el.appendChild(c));
  return el;
}

function kvRow(k = "", v = "") {
  const row = h("div", { class: "kv" }, [
    h("input", { placeholder: "Header", value: k }),
    h("input", { placeholder: "Value", value: v }),
    h("button", { class: "ghost", text: "✕" })
  ]);
  row.querySelector("button").onclick = () => row.remove();
  return row;
}

function app() {
  const root = document.getElementById("app");
  const wrapper = h("div", { class: "wrapper" });

  // LEFT: form
  const formCard = h("div", { class: "card" });
  formCard.appendChild(h("h1", { text: "BenchBuddy" }));

  const form = h("form");
  form.innerHTML = `
    <label>URL
      <input required name="url" placeholder="http://localhost:3000/api/users"/>
    </label>
    <div class="row">
      <label>Method
        <select name="method">
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>PATCH</option>
          <option>DELETE</option>
        </select>
      </label>
      <label>Connections
        <input type="number" name="connections" value="10" min="1"/>
      </label>
    </div>
    <div class="row">
      <label>Duration (s) <input type="number" name="duration" value="10" min="0"/></label>
      <label>Amount (total requests) <input type="number" name="amount" value="0" min="0"/></label>
    </div>
    <label>Headers</label>
    <div id="headers"></div>
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <button type="button" id="addHeader" class="ghost">+ Header</button>
      <button type="button" id="addToken" class="ghost">+ Bearer Token</button>
    </div>
    <label>Body (for POST/PUT/PATCH)
      <textarea name="body" placeholder='{"name":"John"}'></textarea>
    </label>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button type="submit">Run Test</button>
      <button type="button" id="reset" class="ghost">Reset</button>
    </div>
  `;

  const headersDiv = form.querySelector("#headers");
  form.querySelector("#addHeader").onclick = () => headersDiv.appendChild(kvRow());
  form.querySelector("#addToken").onclick = () => headersDiv.appendChild(kvRow("Authorization", "Bearer "));
  form.querySelector("#reset").onclick = () => {
    headersDiv.innerHTML = "";
    form.reset();
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
    setStatus("Running…");
    vscode.postMessage({ type: "run", payload });
  };

  formCard.appendChild(form);

  // RIGHT: results
  const resCard = h("div", { class: "card" });
  const statusEl = h("div", { class: "metric", style: "margin-bottom:8px;" });
  statusEl.innerHTML = `<div class="label">Status</div><div class="value" id="status">Idle</div>`;
  resCard.appendChild(statusEl);

  const metrics = h("div", { class: "metrics" });
  metrics.innerHTML = `
    <div class="metric"><div class="label">Requests/sec</div><div class="value" id="m_rps">–</div></div>
    <div class="metric"><div class="label">Throughput (KB/s)</div><div class="value" id="m_tps">–</div></div>
    <div class="metric"><div class="label">Success (2xx)</div><div class="value" id="m_ok">–</div></div>
    <div class="metric"><div class="label">Failures</div><div class="value" id="m_fail">–</div></div>
  `;
  resCard.appendChild(metrics);

  const canvasLat = h("canvas", { id: "latChart", height: "140" });
  const canvasRps = h("canvas", { id: "rpsChart", height: "140", style: "margin-top:10px;" });
  resCard.appendChild(canvasLat);
  resCard.appendChild(canvasRps);

  const percTitle = h("h3", { text: "Percentiles" });
  percTitle.style.marginTop = "12px";
  resCard.appendChild(percTitle);

  const percTable = h("table");
  percTable.innerHTML = `
    <thead><tr><th>p50</th><th>p75</th><th>p90</th><th>p95</th><th>p99</th></tr></thead>
    <tbody><tr>
      <td id="p50">–</td><td id="p75">–</td><td id="p90">–</td><td id="p95">–</td><td id="p99">–</td>
    </tr></tbody>
  `;
  resCard.appendChild(percTable);

  const codeTitle = h("h3", { text: "Status Buckets" });
  codeTitle.style.marginTop = "12px";
  resCard.appendChild(codeTitle);

  const codeTable = h("table");
  codeTable.innerHTML = `
    <thead><tr><th>Bucket</th><th>Count</th></tr></thead>
    <tbody id="codes"></tbody>
  `;
  resCard.appendChild(codeTable);

  wrapper.appendChild(formCard);
  wrapper.appendChild(resCard);
  root.appendChild(wrapper);

  // Charts
  let latChart, rpsChart;
  function drawCharts(result) {
    const latCtx = document.getElementById("latChart").getContext("2d");
    const rpsCtx = document.getElementById("rpsChart").getContext("2d");

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
      data: { labels: latLabels, datasets: [{ label: "Latency (ms)", data: latData }] },
      options: { responsive: true, animation: false }
    });

    if (rpsChart) rpsChart.destroy();
    rpsChart = new Chart(rpsCtx, {
      type: "bar",
      data: { labels: ["avg rps"], datasets: [{ label: "Requests/sec", data: [result.requestsPerSec ?? 0] }] },
      options: { responsive: true, animation: false }
    });
  }

  function setStatus(text) {
    document.getElementById("status").textContent = text;
  }

  window.addEventListener("message", (e) => {
    const msg = e.data;
    if (msg.type === "status") setStatus(msg.text);
    if (msg.type === "error") {
      setStatus("Error");
      alert(msg.error || "Error");
    }
    if (msg.type === "done") {
      setStatus("Done");
      const r = msg.result;

      // metrics
      document.getElementById("m_rps").textContent = (r.requestsPerSec ?? 0).toFixed(2);
      document.getElementById("m_tps").textContent = ((r.throughputBps ?? 0) / 1024).toFixed(1);

      const ok = Number(r.statusBuckets?.["2xx"] ?? 0);
      const failures = Number(r.errors ?? 0) + Number(r.timeouts ?? 0) + Number(r.statusBuckets?.non2xx ?? 0);
      document.getElementById("m_ok").textContent = String(ok);
      document.getElementById("m_fail").textContent = String(failures);

      // percentiles
      const p = r.latency || {};
      document.getElementById("p50").textContent = p.p50 ?? "–";
      document.getElementById("p75").textContent = p.p75 ?? "–";
      document.getElementById("p90").textContent = p.p90 ?? "–";
      document.getElementById("p95").textContent = p.p95 ?? "–";
      document.getElementById("p99").textContent = p.p99 ?? "–";

      // codes
      const tbody = codeTable.querySelector("#codes");
      tbody.innerHTML = "";
      Object.entries(r.statusBuckets || {}).forEach(([k, v]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${k}</td><td>${v}</td>`;
        tbody.appendChild(tr);
      });

      drawCharts(r);
      // Optionally show raw JSON in console
      console.log("raw result", msg.raw);
    }
  });
}

document.addEventListener("DOMContentLoaded", app);
