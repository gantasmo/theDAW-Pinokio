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
    // The app ships its git hooks in .githooks (ruff on every commit, the
    // cross-platform lock check). theDAW.bat / theDAW.sh set this on every
    // launch; the launcher sets it on every Install and Update instead.
    method: "shell.run",
    params: {
      message: "git config core.hooksPath .githooks",
      path: "app"
    }
  }, {
    // pyk4a-bundle (Azure Kinect backend for AKVJ) only ships a
    // manylinux_2_38 wheel. On older glibc the whole sync fails on it, so
    // retry without it, exactly like theDAW.sh and the Dockerfile do.
    when: "{{platform === 'linux'}}",
    method: "shell.run",
    params: {
      path: "app",
      message: [
        "uv sync --group dev || uv sync --group dev --no-install-package pyk4a-bundle"
      ]
    }
  }, {
    when: "{{platform === 'darwin'}}",
    method: "shell.run",
    params: {
      path: "app",
      env: { "CFLAGS": "-Wno-incompatible-function-pointer-types" },
      message: [
        "uv sync --group dev"
      ]
    }
  }, {
    when: "{{platform === 'win32'}}",
    method: "shell.run",
    params: {
      path: "app",
      message: [
        "uv sync --group dev"
      ]
    }
  }, {
    // The Underfit trainer tab has its own venv (~2.5 GB of torch). Only
    // re-sync it when a previous Install or the app's self-repair built it.
    when: "{{exists('app/underfit/pyproject.toml') && exists('app/underfit/.venv')}}",
    method: "shell.run",
    params: {
      path: "app/underfit",
      message: [
        "uv sync --inexact"
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
    when: "{{exists('app/VST-Foundry-UI/VST-UI-FOUNDRY/package.json')}}",
    method: "shell.run",
    params: {
      path: "app/VST-Foundry-UI/VST-UI-FOUNDRY",
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
