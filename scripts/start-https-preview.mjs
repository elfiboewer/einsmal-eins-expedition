#!/usr/bin/env node

import process from "node:process";
import { spawn } from "node:child_process";
import path from "node:path";

import ngrok from "@expo/ngrok";
import localtunnel from "localtunnel";

const PORT = Number(process.env.PORT ?? 8095);
const PROJECT_ROOT = process.cwd();
const LOCAL_URL = `http://127.0.0.1:${PORT}`;

let serveProcess = null;
let tunnel = null;
let shuttingDown = false;

async function main() {
  await runCommand("npx", ["expo", "export", "--platform", "web"]);

  serveProcess = spawn(getServeBinaryPath(), ["dist", "--single", "--listen", String(PORT)], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });

  serveProcess.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(
        `Preview server stopped unexpectedly (${signal ?? `exit code ${code ?? "unknown"}`}).`
      );
      void cleanup(1);
    }
  });

  await waitForServer();
  const tunnelInfo = await startHttpsTunnel();
  tunnel = tunnelInfo.tunnel;

  console.log("");
  console.log(`Local preview: ${LOCAL_URL}`);
  console.log(`HTTPS preview: ${tunnel.url}`);
  console.log(`HTTPS provider: ${tunnelInfo.provider}`);

  if (tunnelInfo.password) {
    console.log(`Tunnel password: ${tunnelInfo.password}`);
  }

  console.log("");
  console.log("Press Ctrl+C to stop the preview and close the tunnel.");
}

async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}.`));
    });
    child.on("error", reject);
  });
}

async function waitForServer() {
  const maxAttempts = 40;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(LOCAL_URL, { redirect: "manual" });

      if (response.ok || response.status === 301 || response.status === 302) {
        return;
      }
    } catch {
      // Preview server is not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Preview server did not start on ${LOCAL_URL}.`);
}

function getServeBinaryPath() {
  const binaryName = process.platform === "win32" ? "serve.cmd" : "serve";
  return path.join(PROJECT_ROOT, "node_modules", ".bin", binaryName);
}

async function startHttpsTunnel() {
  try {
    const url = await ngrok.connect({
      addr: PORT,
      onLogEvent: (data) => {
        if (typeof data === "string" && data.toLowerCase().includes("lvl=error")) {
          console.error("ngrok:", data);
        }
      },
      onStatusChange: (status) => {
        if (!shuttingDown && status === "closed") {
          console.error("HTTPS tunnel closed unexpectedly.");
          void cleanup(1);
        }
      },
      proto: "http",
    });

    return {
      password: null,
      provider: "ngrok",
      tunnel: {
        close: async () => {
          await ngrok.disconnect();
          await ngrok.kill();
        },
        url,
      },
    };
  } catch (error) {
    console.warn(
      `ngrok konnte nicht gestartet werden. Ich falle auf localtunnel zuruck. ${
        error instanceof Error ? error.message : ""
      }`
    );
  }

  const localTunnel = await localtunnel({ port: PORT });
  localTunnel.on("error", (error) => {
    console.error("localtunnel:", error);
  });
  localTunnel.on("close", () => {
    if (!shuttingDown) {
      console.error("HTTPS tunnel closed unexpectedly.");
      void cleanup(1);
    }
  });

  return {
    password: await getLocalTunnelPassword(),
    provider: "localtunnel",
    tunnel: localTunnel,
  };
}

async function getLocalTunnelPassword() {
  try {
    const response = await fetch("https://loca.lt/mytunnelpassword");

    if (!response.ok) {
      return null;
    }

    const password = (await response.text()).trim();
    return password.length > 0 ? password : null;
  } catch {
    return null;
  }
}

async function cleanup(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  try {
    await tunnel?.close?.();
  } catch {
    // Tunnel already closed.
  }

  if (serveProcess && !serveProcess.killed) {
    serveProcess.kill("SIGINT");
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 200);
}

process.on("SIGINT", () => {
  void cleanup(0);
});

process.on("SIGTERM", () => {
  void cleanup(0);
});

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  void cleanup(1);
});
