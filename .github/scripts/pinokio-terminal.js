// Runs a launcher script's host build step through Pinokio's own shell manager
// and terminal class (kernel/shells.js and kernel/shell.js from a pinokiod
// checkout), on a real cmd.exe behind Pinokio's pty.
//
//   node .github/scripts/pinokio-terminal.js <pinokiod> <script> <launcher root>
//
// pinokio-rules.js asks the same code about recorded output. This one lets it
// type the real lines and read the real terminal, so it also covers what a
// recording cannot: the echo of the command, a build that takes minutes, and
// the lines of one step running one after the other.
//
// Only the kernel around the two classes is a stand-in, and conda activation is
// skipped: the runner's conda is on PATH in place of Pinokio's.
const fs = require("fs")
const os = require("os")
const path = require("path")

const [pinokiod, scriptName, launcher] = [process.argv[2], process.argv[3], process.argv[4]].map((p, i) => (i === 1 ? p : path.resolve(p || ".")))
const home = fs.mkdtempSync(path.join(os.tmpdir(), "pinokio-home-"))
fs.mkdirSync(path.join(home, "api"), { recursive: true })
fs.mkdirSync(path.join(home, "bin"), { recursive: true })
fs.writeFileSync(path.join(home, "ENVIRONMENT"), "")

const Shells = require(path.join(pinokiod, "kernel", "shells.js"))
const kernel = {
  platform: os.platform(),
  arch: os.arch(),
  homedir: home,
  bracketedPasteSupport: {},
  connect: { keys: async () => null },
  envs: process.env,
  exists: async (p) => fs.promises.access(p).then(() => true, () => false),
  path: (...parts) => path.join(home, ...parts),
  which: () => null,
  log: () => {},
  memory: { local: {}, global: {}, key: {}, rpc: {}, input: {}, args: {} },
  bin: { envs: (env) => env || {}, path: (...parts) => path.join(home, "bin", ...parts), vs_path_env: null },
  api: { resolvePath: (cwd, p) => path.resolve(cwd, p), running: {}, userdir: path.join(home, "api") },
  template: { render: (x) => x },
}

async function run(params, cwd, show) {
  const shells = new Shells(kernel)
  kernel.shell = shells
  let seen = ""
  const result = await shells.run({ ...JSON.parse(JSON.stringify(params)), path: cwd, conda: { skip: true } }, { cwd }, (stream) => {
    if (stream && stream.raw) {
      seen += stream.raw
      if (show) process.stdout.write(stream.raw)
    }
  })
  return { error: result && result.error && result.error.length ? result.error : null, seen }
}

const fail = (message) => {
  console.error(`\npinokio-terminal: ${message}`)
  process.exit(1)
}

;(async () => {
  // The rule everything here rests on, asked of this Pinokio: a command that
  // succeeds is still reported as failed when its own text matches /error:/i.
  const probe = await run({ message: "cmd /c exit 0 || echo error: never printed" }, launcher, false)
  console.log(`pinokio-terminal: a good command whose text holds "echo error:" -> ${probe.error ? "reported as an error" : "no error"}`)
  if (!probe.error) console.log("pinokio-terminal: note: this Pinokio no longer matches the echoed command")

  const file = path.join(launcher, scriptName)
  const steps = (scriptName.endsWith(".json") ? JSON.parse(fs.readFileSync(file, "utf8")) : require(file)).run
  const found = steps.filter((s) => [].concat((s.params && s.params.message) || []).join(" ").includes("build.ps1"))
  if (found.length !== 1) fail(`${scriptName}: expected one host build step, found ${found.length}`)
  const step = found[0]
  const cwd = path.join(launcher, step.params.path || "")
  const exe = path.join(cwd, "native", "vst-host", "bin", "thedaw-vst-host.exe")

  console.log(`pinokio-terminal: ${scriptName}, typed by Pinokio's terminal in ${cwd}`)
  const built = await run(step.params, cwd, true)
  console.log(`\npinokio-terminal: Pinokio reports ${built.error ? "an error " + JSON.stringify(built.error) : "no error"}; the host ${fs.existsSync(exe) ? "exists" : "is missing"}`)
  if (!fs.existsSync(exe)) fail(`${scriptName} did not produce ${exe}`)
  if (built.error) fail(`${scriptName} built the host and Pinokio still reports an error`)
  process.exit(0)
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
