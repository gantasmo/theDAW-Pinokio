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
    let installed = info.exists("app/.venv") && info.exists("app/frontend/node_modules")
    let downloading = [
      "download-small-arc.json",
      "download-small-rf.json",
      "download-medium-arc.json",
      "download-medium-rf.json"
    ]
    let is_downloading = null
    for(let item of downloading) {
      let d = info.running(item)
      if (d === true) {
        is_downloading = item
        break;
      }
    }
    let running = {
      install: info.running("install.json"),
      start: info.running("start.json"),
      update: info.running("update.js"),
      reset: info.running("reset.js"),
    }
    if (running.install) {
      return [{
        default: true,
        icon: "fa-solid fa-plug",
        text: "Installing",
        href: "install.json",
      }]
    } else if (installed) {
      if (running.start) {
        let local = info.local("start.json")
        if (local && local.url) {
          return [{
            default: true,
            icon: "fa-solid fa-rocket",
            text: "Open Web UI",
            href: local.url,
          }, {
            icon: 'fa-solid fa-terminal',
            text: "Server",
            href: "start.json",
          }]
        } else {
          return [{
            default: true,
            icon: 'fa-solid fa-terminal',
            text: "Server",
            href: "start.json",
          }]
        }
      } else if (running.update) {
        return [{
          default: true,
          icon: 'fa-solid fa-terminal',
          text: "Updating",
          href: "update.js",
        }]
      } else if (running.reset) {
        return [{
          default: true,
          icon: 'fa-solid fa-terminal',
          text: "Resetting",
          href: "reset.js",
		}]
	  } else if (running.cache) {
        return [{
          default: true,
          icon: 'fa-solid fa-terminal',
          text: "Clearing Cache",
          href: "delete-cache.js",
        }]
      } else if (running.link) {
        return [{
          default: true,
          icon: 'fa-solid fa-terminal',
          text: "Deduplicating",
          href: "link.js",
        }]
      } else {
        return [{
          default: true,
          icon: "fa-solid fa-power-off",
          text: "Start",
          href: "start.json",
        }, {
          icon: "fa-solid fa-download",
          text: "Download Models",
          menu: [
            { text: "Small (ARC)", icon: "fa-solid fa-download", href: "download-small-arc.json", mode: "refresh" },
            { text: "Small (RF)", icon: "fa-solid fa-download", href: "download-small-rf.json", mode: "refresh" },
            { text: "Medium (ARC)", icon: "fa-solid fa-download", href: "download-medium-arc.json", mode: "refresh" },
            { text: "Medium (RF)", icon: "fa-solid fa-download", href: "download-medium-rf.json", mode: "refresh" },
          ]
        }, {
          icon: "fa-solid fa-rocket",
          text: "Update",
          href: "update.js",
        }, {
          icon: "fa-solid fa-plug",
          text: "Install",
          href: "install.json",
        }, {
          icon: "fa-regular fa-circle-xmark",
          text: "Reset",
          href: "reset.js",
          confirm: "Are you sure you wish to reset this app?",
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
