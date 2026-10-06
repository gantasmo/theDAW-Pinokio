// Reads the launcher's own scripts for the Checks workflow, so every job runs
// what Pinokio would run and nothing is retyped in the workflow.
//
//   node .github/scripts/launcher.js validate
//   node .github/scripts/launcher.js vj-env            KEY=VALUE lines
//   node .github/scripts/launcher.js lines <script>    the host build step's shell lines
//   node .github/scripts/launcher.js vj-script <script> the app/vj steps as a bash script
const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "..", "..")
const fail = (message) => {
  console.error(`launcher: ${message}`)
  process.exit(1)
}

const steps = (name) => {
  const file = path.join(root, name)
  const script = name.endsWith(".json") ? JSON.parse(fs.readFileSync(file, "utf8")) : require(file)
  if (!script || !Array.isArray(script.run)) fail(`${name} has no run list`)
  return script.run
}
const lines = (step) => [].concat((step.params && step.params.message) || [])
const one = (name, test, what) => {
  const found = steps(name).filter(test)
  if (found.length !== 1) fail(`${name}: expected one ${what}, found ${found.length}`)
  return found[0]
}
const vjInstall = (name) =>
  one(name, (s) => s.params && s.params.path === "app/vj" && lines(s).join(" ") === "npm install", "VJ npm install step")
const hostBuild = (name) => one(name, (s) => lines(s).join(" ").includes("build.ps1"), "host build step")

// The steps a script runs inside app/vj, in order, each with its environment.
const vjSteps = (name) =>
  steps(name)
    .filter((s) => s.params && s.params.path === "app/vj")
    .map((s) => ({ env: s.params.env || {}, lines: lines(s) }))

const command = process.argv[2]

if (command === "vj-env") {
  const install = vjInstall("install.json").params.env || {}
  const update = vjInstall("update.js").params.env || {}
  if (JSON.stringify(install) !== JSON.stringify(update)) fail("install.json and update.js give the VJ install different environments")
  if (!Object.keys(install).length) fail("the VJ install sets no environment")
  for (const [key, value] of Object.entries(install)) console.log(`${key}=${value}`)
} else if (command === "vj-script") {
  const out = ["set -e"]
  for (const step of vjSteps(process.argv[3])) {
    const env = Object.entries(step.env).map(([key, value]) => `export ${key}=${JSON.stringify(String(value))}; `).join("")
    for (const line of step.lines) out.push(`( ${env}${line} )`)
  }
  console.log(out.join("\n"))
} else if (command === "lines") {
  for (const line of lines(hostBuild(process.argv[3]))) console.log(line)
} else if (command === "validate") {
  for (const name of fs.readdirSync(root)) {
    if (name.endsWith(".json") && name !== "pinokio.json") steps(name)
    if (name.endsWith(".json")) JSON.parse(fs.readFileSync(path.join(root, name), "utf8"))
  }
  steps("update.js")
  steps("reset.js")

  // Install and Update run the same steps in the VJ checkout.
  if (JSON.stringify(vjSteps("install.json")) !== JSON.stringify(vjSteps("update.js"))) fail("install.json and update.js run different steps in app/vj")

  // Install and Update build the host with the same lines, and neither can be
  // failed by Pinokio's default error patterns.
  const install = hostBuild("install.json")
  const update = hostBuild("update.js")
  if (JSON.stringify(lines(install)) !== JSON.stringify(lines(update))) fail("install.json and update.js build the host differently")
  for (const [name, step] of [["install.json", install], ["update.js", update]]) {
    const off = (step.params.on || []).filter((h) => h.break === false).map((h) => h.event)
    for (const pattern of ["/error:/i", "/errno /i"]) {
      if (!off.includes(pattern)) fail(`${name}: the host build does not switch ${pattern} off`)
    }
  }
  const button = hostBuild("build-vst-host.json")
  if ((button.params.on || []).length) fail("build-vst-host.json must keep Pinokio's error patterns")

  const menu = require(path.join(root, "pinokio.js")).menu
  const info = (exists, running) => ({
    exists: (p) => exists.includes(p),
    running: (p) => running.includes(p),
    local: () => ({}),
  })
  const base = ["app/.venv", "app/frontend/node_modules", "app/native/vst-host/build.ps1"]
  const exe = "app/native/vst-host/bin/thedaw-vst-host.exe"
  const cases = [
    ["win32", base, [], "Start | Download Models | Update | Install | Build VST3 Host | Reset | Sponsor"],
    ["win32", base.concat(exe), [], "Start | Download Models | Update | Install | Rebuild VST3 Host | Reset | Sponsor"],
    ["linux", base, [], "Start | Download Models | Update | Install | Reset | Sponsor"],
    ["darwin", base, [], "Start | Download Models | Update | Install | Reset | Sponsor"],
    ["win32", base, ["build-vst-host.json"], "Building VST3 Host"],
    ["win32", base, ["install.json"], "Installing"],
    ["win32", base, ["update.js"], "Updating"],
    ["win32", [], [], "Install | Sponsor"],
  ]
  ;(async () => {
    for (const [platform, exists, running, want] of cases) {
      const got = (await menu({ platform }, info(exists, running))).map((item) => item.text).join(" | ")
      if (got !== want) fail(`menu on ${platform} with [${running}] running: got "${got}", want "${want}"`)
    }
    console.log(`launcher: every script parses and ${cases.length} menu states are right`)
  })()
} else {
  fail("usage: launcher.js validate | vj-env | lines <script> | vj-script <script>")
}
