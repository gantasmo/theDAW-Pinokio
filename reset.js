// Reset clears the installed dependencies only. It never deletes app/ itself:
// the clone holds the user's library, settings and generated audio under
// app/data, so wiping the whole folder would destroy their work. The next
// Install skips the clone step (app/ still exists) and rebuilds these trees.
const DEPENDENCY_DIRS = [
  "app/.venv",
  "app/frontend/node_modules",
  "app/vj/node_modules",
  "app/underfit/.venv",
  "app/VST-Foundry-UI/VST-UI-FOUNDRY/node_modules",
]

module.exports = {
  run: DEPENDENCY_DIRS.map((dir) => ({
    when: `{{exists('${dir}')}}`,
    method: "fs.rm",
    params: { path: dir },
  })),
}
