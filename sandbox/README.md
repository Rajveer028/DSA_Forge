# DSA Forge — sandboxed execution worker

Submitted code must never run inside the Next.js process. This directory holds
the isolated worker that the app talks to in production.

```
Next.js route handler
        ↓  (POST /execute — code + test inputs only)
Execution API  (src/lib/execution)
        ↓
Work queue     (bounded concurrency, backed by code_executions rows)
        ↓
Sandbox worker (this service)
        ↓
Docker container, one per submission
        ↓
Compiler / runtime → test cases → stdout
        ↓
Judge (src/lib/execution/judge.ts) → verdict → database
```

## What the isolation actually is

Each submission runs in a throwaway container with:

| Control | Flag |
| --- | --- |
| No network at all | `--network none` |
| No writable host filesystem | `--read-only` + `--tmpfs /tmp` |
| No Linux capabilities | `--cap-drop ALL` |
| No privilege escalation | `--security-opt no-new-privileges` |
| Process/thread cap | `--pids-limit 64` |
| Memory cap (no swap) | `--memory` / `--memory-swap` |
| CPU cap | `--cpus 1` |
| Unprivileged user | `--user 65534:65534` |
| Wall-clock kill | `timeout -s KILL` inside the container |
| Output cap | worker truncates and kills past the byte limit |

The worker has **no** `DATABASE_URL`, **no** `CLERK_SECRET_KEY` and **no**
`AI_API_KEY`. Even a full compromise of a container yields only the source code
and test inputs of the job it was running.

## Running it

```bash
# on a host with Docker, separate from the web server
cd sandbox
EXECUTION_SERVICE_TOKEN=$(openssl rand -hex 32) node server.js
```

Pre-pull the runtime images so the first submission is not slow:

```bash
docker pull gcc:13
docker pull eclipse-temurin:21-jdk
docker pull python:3.12-slim
```

Then point the app at it:

```bash
EXECUTION_DRIVER=remote
EXECUTION_SERVICE_URL=http://sandbox-host:8080
EXECUTION_SERVICE_TOKEN=<the same token>
```

### docker compose

```yaml
services:
  sandbox:
    image: node:22-alpine
    command: node /app/server.js
    volumes:
      - ./sandbox:/app:ro
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      PORT: "8080"
      EXECUTION_SERVICE_TOKEN: "${EXECUTION_SERVICE_TOKEN}"
    ports:
      - "8080:8080"
```

> Mounting the Docker socket gives this container control of the daemon. Run the
> worker on a dedicated host (or with a rootless/`sysbox` runtime) and never
> expose port 8080 to the public internet — only the app server should reach it.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness + supported languages |
| `GET` | `/languages` | Supported languages |
| `POST` | `/execute` | Run one job (`SandboxJob` → `SandboxResult`) |

All requests require `Authorization: Bearer $EXECUTION_SERVICE_TOKEN` when the
token is configured.

## Local development

Without this service the app falls back to `EXECUTION_DRIVER=local`
(`src/lib/execution/drivers/local.ts`), which runs code on the host with a
stripped environment, argv-only commands, a hard timeout, an stdout cap and —
on POSIX — CPU, address-space and process rlimits.

That driver is **not a security boundary** and refuses to start when
`NODE_ENV=production`. It exists so you can develop without Docker, provided the
toolchain (`gcc`, `g++`, `javac`/`java`, `python3`) is on your PATH.
