module.exports = {
  version: "7.0",
  icon: "icon.png",
  menu: async (kernel, info) => {
    /**********************************************************************************************
    * 
    * `info` has 4 methods (where `filepath` may be a relative path or an absolute path.):
    * 
    *   - info.local(filepath): get the local variable object of a script running at `filepath`. Example:
    *     
    *     // get local variables for the currently running start.json script
    *     let local = info.local("start.json")
    *     if (local.url) {
    *       // do something with local.url (the 'url' local variable set inside the start.json script)
    *     }
    * 
    *   - info.running(filepath): get the running status of a script at `filepath`. Example:
    * 
    *     // check if install.json script is running
    *     let installing = info.running("install.json")
    *     if (installing) {
    *       ...
    *     }
    * 
    *   - info.exists(filepath): check if a file exists at `filepath`. Example:
    * 
    *     // check if app/venv path exists
    *     let dependency_installed = info.exists("app/venv")
    *     if (dependency_installed) {
    *       ...
    *     }
    * 
    *   - info.path(filepath): get the absolute path of a `fileapth`. Example:
    * 
    *     // get the install.json absolute path
    *     let absolute_path = info.path("install.json")
    * 
    **********************************************************************************************/
    let installed = info.exists("app/node_modules")
    let running = {
      install: info.running("install.json"),
      start: info.running("start.json"),
      update: info.running("update.js"),
      reset: info.running("reset.js"),
    }
    if (running.install) {
      return [{
        icon: "fa-solid fa-plug",
        text: "Installing",
        href: "install.json",
      }]
    } else if (installed) {
      if (running.start) {
        let local = info.local("start.json")
        if (local && local.url) {
          return [{
            icon: "fa-solid fa-power-off",
            text: "Server",
            href: "start.json",
          }, {
            default: true,
            icon: "fa-solid fa-rocket",
            text: "Open App",
            href: local.url,
          }]
        }
      } else if (running.update) {
        return [{
          default: true,
          icon: "fa-solid fa-rocket",
          text: "Updating",
          href: "update.js"
        }]
      } else if (running.reset) {
        return [{
          default: true,
          icon: "fa-solid fa-rocket",
          text: "Resetting",
          href: "reset.js"
        }]
      } else {
        return [{
          icon: "fa-solid fa-power-off",
          text: "Start",
          href: "start.json",
        }, {
          icon: "fa-solid fa-rocket",
          text: "Update",
          href: "update.js"
        }, {
          icon: "fa-solid fa-plug",
          text: "Install",
          href: "install.json",
        }, {
          icon: "fa-regular fa-circle-xmark",
          text: "<div><strong>Reset</strong><div>Revert to pre-install state</div></div>",
          href: "reset.js",
          confirm: "Are you sure you wish to reset the app?"
        }]
      }
    } else {
      return [{
        default: true,
        icon: "fa-solid fa-plug",
        text: "Install",
        href: "install.json",
      }]
    }
  }
}
