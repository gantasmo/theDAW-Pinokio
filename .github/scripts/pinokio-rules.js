// Runs the launcher's real steps through Pinokio's own shell manager.
//
//   node .github/scripts/pinokio-rules.js <path to a pinokiod checkout>
//
// Pinokio decides that a shell.run step failed by matching its terminal output
// against /error:/i and /errno /i, whatever the exit code (kernel/shells.js).
// The terminal echoes the command it was given, so the command text is matched
// too. This loads that file as Pinokio ships it, swaps only the terminal for
// one that plays back recorded output (the way pinokiod's own
// test/shells-live-error.test.js does), and asks it about each host build step:
//
//   - Install and Update: a failed build must not fail the step.
//   - Build VST3 Host: a successful build must not be reported as failed, and a
//     failed one must be.
const Module = require("node:module")
const fs = require("fs")
const path = require("path")

const pinokiod = path.resolve(process.argv[2] || "pinokiod")
const root = path.resolve(__dirname, "..", "..")
const shellsPath = path.join(pinokiod, "kernel", "shells.js")
if (!fs.existsSync(shellsPath)) {
  console.error(`pinokio-rules: no kernel/shells.js under ${pinokiod}`)
  process.exit(1)
}

const steps = (name) => {
  const file = path.join(root, name)
  return (name.endsWith(".json") ? JSON.parse(fs.readFileSync(file, "utf8")) : require(file)).run
}
const hostBuild = (name) => {
  const found = steps(name).filter((s) => [].concat((s.params && s.params.message) || []).join(" ").includes("build.ps1"))
  if (found.length !== 1) throw new Error(`${name}: expected one host build step, found ${found.length}`)
  return found[0]
}

// What Pinokio's shell manager returns for `params` when the terminal prints
// `chunks`. A step failed when the result carries `error`.
async function ask(params, chunks) {
  const prompt = "(base) C:\\pinokio\\api\\theDAW-Pinokio.git\\app>"
  class RecordedTerminal {
    constructor() {
      this.id = "recorded"
      this.monitor = ""
      this.resolved = undefined
    }
    stripAnsi(value) {
      return value
    }
    kill(message) {
      this.resolved = message || prompt
    }
    continue(message) {
      this.resolved = message || prompt
    }
    async start(_params, onstream) {
      for (const chunk of chunks) {
        await onstream({ raw: chunk })
        if (this.resolved !== undefined) return this.resolved
      }
      return chunks.join("") + prompt
    }
  }
  const load = Module._load
  Module._load = function (request, parent) {
    if (request === "./shell" && parent && /kernel[\\/]shells\.js$/.test(parent.filename)) return RecordedTerminal
    return load.apply(this, arguments)
  }
  try {
    delete require.cache[require.resolve(shellsPath)]
    const Shells = require(shellsPath)
    const kernel = {
      platform: "win32",
      homedir: "C:\\pinokio",
      bracketedPasteSupport: { "cmd.exe": true },
      bin: { envs: (env) => env || {} },
      api: { resolvePath: (_cwd, execPath) => execPath, running: {} },
      which: () => null,
    }
    const result = await new Shells(kernel).run(JSON.parse(JSON.stringify(params)), { cwd: "C:\\pinokio\\api\\theDAW-Pinokio.git" }, () => {})
    return result && result.error && result.error.length ? result.error : null
  } finally {
    Module._load = load
    delete require.cache[require.resolve(shellsPath)]
  }
}

// A terminal session for a step: each command echoed at the prompt, then what
// it printed. `built` picks a successful or a failed build.ps1.
const session = (step, built) => {
  const lines = [].concat(step.params.message)
  const out = []
  for (const line of lines) {
    out.push(`(base) C:\\pinokio\\api\\theDAW-Pinokio.git\\app>${line}\r\n`)
    if (line.startsWith("conda install")) {
      out.push("Channels:\r\n - conda-forge\r\n - defaults\r\nPlatform: win-64\r\n# All requested packages already installed.\r\n")
      continue
    }
    out.push("cmake:     C:\\pinokio\\bin\\miniforge\\Library\\bin\\cmake.exe\r\nvst3:      ON\r\ngenerator: Visual Studio 17 2022\r\n")
    if (built) {
      out.push("  thedaw-vst-host.vcxproj -> C:\\pinokio\\api\\theDAW-Pinokio.git\\app\\native\\vst-host\\build\\Release\\thedaw-vst-host.exe\r\n")
      out.push("built  C:\\pinokio\\api\\theDAW-Pinokio.git\\app\\native\\vst-host\\bin\\thedaw-vst-host.exe\r\nsize   812.5 KB\r\ntime   96.4 s\r\n")
    } else {
      // The real output of a failed configure and a failed compile, plus the
      // lines a CMake or compiler error carries that Pinokio's patterns match.
      out.push("CMake Error at CMakeLists.txt:2 (project):\r\n  No CMAKE_CXX_COMPILER could be found.\r\n")
      out.push("CMake Error: CMAKE_CXX_COMPILER not set, after EnableLanguage\r\n")
      out.push("D:\\src\\engine\\Session.cpp(12,10): fatal error C1083: Cannot open include file: 'windows.h': [Errno 2] No such file or directory\r\n")
      out.push("cmake configure failed with exit code 1\r\n    + FullyQualifiedErrorId : cmake configure failed with exit code 1\r\n")
      // What the `||` part of the step's own line prints.
      const tail = line.split("||").pop().trim()
      if (line.includes("||") && tail.startsWith("echo ")) out.push(tail.slice(5).replace(/\^(.)/g, "$1") + "\r\n")
    }
  }
  return out
}

const failures = []
const expect = async (label, params, chunks, wantError) => {
  const error = await ask(params, chunks)
  const ok = wantError ? error !== null : error === null
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: Pinokio ${error ? `reports an error (${JSON.stringify(error)})` : "reports no error"}`)
  if (!ok) failures.push(label)
}

;(async () => {
  for (const name of ["install.json", "update.js"]) {
    const step = hostBuild(name)
    await expect(`${name}, the host builds`, step.params, session(step, true), false)
    await expect(`${name}, the host build fails`, step.params, session(step, false), false)
    // The control: without the step's `on`, the same failed build stops the run.
    const bare = JSON.parse(JSON.stringify(step.params))
    delete bare.on
    await expect(`${name}, the host build fails, with the step's "on" removed`, bare, session(step, false), true)
  }
  const button = hostBuild("build-vst-host.json")
  await expect("build-vst-host.json, the host builds", button.params, session(button, true), false)
  await expect("build-vst-host.json, the host build fails", button.params, session(button, false), true)
  if (failures.length) {
    console.error(`pinokio-rules: ${failures.length} wrong: ${failures.join("; ")}`)
    process.exit(1)
  }
  console.log("pinokio-rules: Pinokio's shell manager treats every host build step as intended")
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
