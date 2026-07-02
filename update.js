module.exports = {
  run: [{
    method: "shell.run",
    params: {
      message: "git pull"
    }
  }, {
    method: "shell.run",
    params: {
      message: "git pull",
      path: "app"
    }
  }, {
    method: "shell.run",
    params: {
      message: "git submodule update --init --recursive",
      path: "app"
    }
  }, {
    method: "shell.run",
    params: {
      path: "app",
      message: [
        "uv sync --group dev"
      ]
    }
  }, {
    method: "shell.run",
    params: {
      path: "app/frontend",
      message: [
        "npm install"
      ]
    }
  }]
}
