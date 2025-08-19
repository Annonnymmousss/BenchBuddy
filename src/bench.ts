import autocannon from "autocannon";

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

// Define a minimal Result type (based on autocannon’s actual output)
export type Result = {
  url: string;
  errors: number;
  latency: Record<string, number>;
  requests: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    total: number;
    sent: number;
  };
  throughput: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    total: number;
  };
  [key: string]: any; // allow extra fields like 2xx, 4xx, etc.
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
    timeout: (cfg.timeoutSeconds ?? 10) * 1000,
  };

  if (cfg.body && cfg.body.trim()) {
    opts.body = cfg.body;
  }

  return new Promise<Result>((resolve, reject) => {
    const inst = autocannon(opts, (err: Error | null, res: any) => {
      if (err) return reject(err);
      resolve(res as Result);
    });

    // optional: live tracking
    // inst.on("tick", (t) => {});
  });
}
