module.exports = {
  run: [{
    method: "fs.rm",
    params: {
      path: "app/.venv"
    }
  }, {
    method: "fs.rm",
    params: {
      path: "app/frontend/node_modules"
    }
  }]
}
