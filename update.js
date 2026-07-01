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
      path: "app",
      message: [
        // add the command to run after pulling in updates from the git repo
        // for example to reinstall the dependencies, etc.
      ]
    }
  }]
}
