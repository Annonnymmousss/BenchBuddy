import autocannon, { Result } from "autocannon";

export type BenchConfig = {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  connections: number;
  duration?: number;
  amount?: number;
  headers?: Record<string, string>;
  body?: string;
  timeoutSeconds?: number;
};

export type BenchResultView = {
  url: string;
  method: string;
  requestsPerSec: number;
  totalRequests: number;
  errors: number;
  timeouts: number;
  throughputBps: number;
  latency: {
    average?: number;
    p50?: number;
    p75?: number;
    p90?: number;
    p95?: number;
    p99?: number;
  };
  statusBuckets: Record<string, number>;
};

export async function runBenchmark(cfg: BenchConfig): Promise<Result> {
  // Prepare options for autocannon
  const opts: any = {
    url: cfg.url,
    method: cfg.method,
    connections: cfg.connections ?? 10,
    duration: cfg.duration && cfg.duration > 0 ? cfg.duration : undefined,
    amount: cfg.amount && cfg.amount > 0 ? cfg.amount : undefined,
    headers: cfg.headers || {},
    timeout: (cfg.timeoutSeconds ?? 10) * 1000
  };

  if (cfg.body && cfg.body.trim()) {
    opts.body = cfg.body;
  }

  return new Promise((resolve, reject) => {
    const inst = autocannon(opts, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });

    // optional: you can live-track here (not wired in MVP UI)
    // inst.on('tick', t => { /* t.reqsDelta, t.bytesDelta, t.latency */ });
  });
}
