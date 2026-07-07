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
  }, {
    // git pull never re-provisions the VJ app (it's a separate clone, not a
    // submodule), so once app/vj goes missing the VJ tab stays broken across
    // every Update. Re-clone it here when absent so Update self-heals.
    when: "{{!exists('app/vj')}}",
    method: "shell.run",
    params: {
      path: "app",
      message: [
        "git clone https://github.com/gantasmo/VJ-9000 vj"
      ]
    }
  }, {
    method: "shell.run",
    params: {
      path: "app/vj",
      message: [
        "npm install"
      ]
    }
  }]
}
