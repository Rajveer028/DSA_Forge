/**
 * DSA Forge sandbox execution worker.
 *
 * A deliberately tiny HTTP service that compiles and runs untrusted submissions
 * inside single-use Docker containers, one container per submission:
 *
 *   --network none          no outbound or lateral network access
 *   --read-only + tmpfs     no writable host filesystem
 *   --cap-drop ALL          no Linux capabilities
 *   --security-opt no-new-privileges
 *   --pids-limit            no fork bombs
 *   --memory / --cpus       cgroup CPU and memory caps
 *   --user 65534:65534      runs as nobody
 *   timeout(1) inside       wall-clock kill per test case
 *
 * It holds NO application credentials: no database URL, no Clerk secret, no AI
 * key. The only thing it ever receives is source code plus test inputs, and the
 * only thing it returns is stdout/stderr/exit status per test case.
 *
 * Run it on a host that is not the web server, and point the Next.js app at it
 * with EXECUTION_DRIVER=remote and EXECUTION_SERVICE_URL=http://host:8080.
 */

const http = require("node:http");
const { spawn } = require("node:child_process");
const { mkdtemp, writeFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.EXECUTION_SERVICE_TOKEN || "";
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const COMPILE_TIMEOUT_MS = 20_000;

const LANGUAGES = {
  C: {
    image: process.env.IMAGE_C || "gcc:13",
    file: "main.c",
    compile: ["gcc", "-O2", "-std=c17", "-o", "program", "main.c", "-lm"],
    run: ["./program"],
    overheadMs: 0,
  },
  CPP: {
    image: process.env.IMAGE_CPP || "gcc:13",
    file: "main.cpp",
    compile: ["g++", "-O2", "-std=c++17", "-o", "program", "main.cpp"],
    run: ["./program"],
    overheadMs: 0,
  },
  JAVA: {
    image: process.env.IMAGE_JAVA || "eclipse-temurin:21-jdk",
    file: "Main.java",
    compile: ["javac", "-encoding", "UTF-8", "Main.java"],
    run: ["java", "-Xss64m", "-XX:+UseSerialGC", "Main"],
    overheadMs: 600,
  },
  PYTHON: {
    image: process.env.IMAGE_PYTHON || "python:3.12-slim",
    file: "main.py",
    compile: null,
    run: ["python3", "-E", "-S", "main.py"],
    overheadMs: 200,
  },
};

/** Builds the `docker run` argv for one command inside the workdir. */
function dockerArgs(spec, workdir, limits, command, timeoutMs) {
  const seconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  return [
    "run",
    "--rm",
    "--interactive",
    "--network", "none",
    "--read-only",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--pids-limit", String(limits.processLimit || 64),
    "--memory", `${limits.memoryMb}m`,
    "--memory-swap", `${limits.memoryMb}m`,
    "--cpus", "1",
    "--user", "65534:65534",
    "--workdir", "/work",
    // The work directory is bind-mounted read-write only for compilation; the
    // run phase uses the same directory but the container root stays read-only.
    "--volume", `${workdir}:/work:rw`,
    spec.image,
    "timeout", "-s", "KILL", `${seconds}s`,
    ...command,
  ];
}

function runProcess(command, args, { stdin, outputLimit, timeoutMs }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let bytes = 0;
    let truncated = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs + 5_000);

    child.stdout.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > outputLimit) {
        truncated = true;
        child.kill("SIGKILL");
        return;
      }
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 8192) stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      stderr += `\n${error.message}`;
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        stdout: truncated ? stdout.slice(0, outputLimit) : stdout,
        stderr,
        exitCode: code,
        runtimeMs: Date.now() - started,
        truncated,
        timedOut: timedOut || code === 137 || code === 124,
      });
    });

    if (stdin !== undefined) {
      child.stdin.on("error", () => {});
      child.stdin.end(stdin);
    } else {
      child.stdin.end();
    }
  });
}

async function execute(job) {
  const spec = LANGUAGES[job.language];
  if (!spec) {
    return {
      compiled: false,
      compileLog: null,
      cases: [],
      fatal: { status: "INTERNAL_ERROR", message: `Unsupported language ${job.language}.` },
    };
  }

  const dir = await mkdtemp(path.join(tmpdir(), "forge-job-"));
  try {
    await writeFile(path.join(dir, spec.file), job.code, "utf8");
    const limits = job.limits || { timeoutMs: 5000, memoryMb: 256, outputLimitBytes: 65536, processLimit: 64 };

    // ---- compile ----
    let compileLog = null;
    if (spec.compile) {
      const compiled = await runProcess(
        "docker",
        dockerArgs(spec, dir, { ...limits, memoryMb: Math.max(limits.memoryMb, 512) }, spec.compile, COMPILE_TIMEOUT_MS),
        { outputLimit: 32 * 1024, timeoutMs: COMPILE_TIMEOUT_MS },
      );
      compileLog = [compiled.stdout, compiled.stderr].filter(Boolean).join("\n").trim() || null;
      if (compiled.exitCode !== 0) {
        return { compiled: false, compileLog: compileLog || "Compilation failed.", cases: [] };
      }
    }

    // ---- run each case ----
    const cases = [];
    for (const testCase of job.testCases) {
      const result = await runProcess(
        "docker",
        dockerArgs(spec, dir, limits, spec.run, limits.timeoutMs + spec.overheadMs),
        {
          stdin: testCase.input.endsWith("\n") ? testCase.input : `${testCase.input}\n`,
          outputLimit: limits.outputLimitBytes,
          timeoutMs: limits.timeoutMs + spec.overheadMs,
        },
      );

      cases.push({
        index: testCase.index,
        id: testCase.id,
        kind: testCase.kind,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.timedOut ? null : result.exitCode,
        runtimeMs: Math.max(0, result.runtimeMs - spec.overheadMs),
        // Docker reports OOM kills as exit 137, same as SIGKILL; the stderr
        // pattern disambiguates the common runtime cases.
        memoryKb: null,
        timedOut: result.timedOut,
        outputTruncated: result.truncated,
        memoryExceeded:
          /std::bad_alloc|OutOfMemoryError|MemoryError|Cannot allocate memory|Killed/i.test(
            result.stderr,
          ),
      });
    }

    return { compiled: true, compileLog: null, cases };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Payload too large"));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  const send = (status, payload) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
  };

  if (TOKEN) {
    const header = request.headers.authorization || "";
    if (header !== `Bearer ${TOKEN}`) return send(401, { error: "Unauthorized" });
  }

  if (request.method === "GET" && request.url === "/health") {
    return send(200, { status: "ok", languages: Object.keys(LANGUAGES) });
  }
  if (request.method === "GET" && request.url === "/languages") {
    return send(200, { languages: Object.keys(LANGUAGES) });
  }
  if (request.method === "POST" && request.url === "/execute") {
    try {
      const job = JSON.parse(await readBody(request));
      if (!job || typeof job.code !== "string" || !Array.isArray(job.testCases)) {
        return send(400, { error: "Invalid job payload" });
      }
      const result = await execute(job);
      return send(200, result);
    } catch (error) {
      console.error("[sandbox]", error);
      return send(500, {
        compiled: false,
        compileLog: null,
        cases: [],
        fatal: { status: "INTERNAL_ERROR", message: "The sandbox worker failed to run this job." },
      });
    }
  }

  return send(404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`DSA Forge sandbox worker listening on :${PORT}`);
  console.log(`Languages: ${Object.keys(LANGUAGES).join(", ")}`);
  if (!TOKEN) console.warn("EXECUTION_SERVICE_TOKEN is not set — the worker is unauthenticated.");
});
