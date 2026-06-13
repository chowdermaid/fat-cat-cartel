import { spawn } from "node:child_process";

const shell = true;
const children = [];

function start(command, args) {
  const child = spawn(command, args, {
    shell,
    stdio: "inherit",
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ?? code ?? 0;
    console.log(`\n${command} exited (${reason}); stopping dev services.`);
    shutdown(code ?? 0);
  });

  return child;
}

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }

  setTimeout(() => {
    process.exit(code);
  }, 500);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("firebase", [
  "emulators:start",
  "--import=./emulator-data",
  "--export-on-exit=./emulator-data",
]);

start("npm", ["run", "dev", "--", "--mode", "emulator"]);
