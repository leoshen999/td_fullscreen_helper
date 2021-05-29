let observer = null;
let container = null;
let canvas = null;
let mask = null;

let width = null;
let height = null;

let canvasOriginalMaxWidth = "";

function redispatchMouseEvent(oldEvent) {
  var propertiesToCopy = [
    "ctrlKey",
    "shiftKey",
    "altKey",
    "metaKey",
    "button",
    "buttons",
    "relatedTarget",
    "region",
    "detail",
    "view",
    "sourceCapabilities",
    "bubbles",
    "cancelable",
    "composed",
  ];

  var initArgs = {};
  propertiesToCopy.forEach(ptc => {
    initArgs[ptc] = oldEvent[ptc];
  });

  var rect = oldEvent.target.getBoundingClientRect();
  var newOffsetX = oldEvent.offsetX * width / rect.width;
  var newOffsetY = oldEvent.offsetY * height / rect.height;
  initArgs.clientX = oldEvent.clientX - oldEvent.offsetX + newOffsetX;
  initArgs.clientY = oldEvent.clientY - oldEvent.offsetY + newOffsetY;
  initArgs.screenX = oldEvent.screenX - oldEvent.offsetX + newOffsetX;
  initArgs.screenY = oldEvent.screenY - oldEvent.offsetY + newOffsetY;
  var newEvent = new MouseEvent(oldEvent.type, initArgs);
  oldEvent.stopPropagation();

  canvas.dispatchEvent(newEvent);
}

function handleFullscreenChange() {
  if (document.fullscreenElement) {
    canvasOriginalMaxWidth = canvas.style.maxWidth;

    container.classList.add("TDFullscreenHelper_container");
    canvas.classList.add("TDFullscreenHelper_canvas");
    canvas.style.maxWidth = "calc(100vh * " + width + " / " + height + ")";
    mask.style.display = "";
  } else {
    container.classList.remove("TDFullscreenHelper_container");
    canvas.classList.remove("TDFullscreenHelper_canvas");
    canvas.style.maxWidth = canvasOriginalMaxWidth;
    mask.style.display = "none";
  }
}

function processTargetCanvas(c) {
  canvas = c;
  container = canvas.parentElement;
  mask = document.createElement("div");

  mask.classList.add("TDFullscreenHelper_mask");
  mask.style.display = "none";
  mask.style.maxWidth = "calc(100vh * " + width + " / " + height + ")";
  mask.style.aspectRatio = "auto " + width + " / " + height;
  container.appendChild(mask);

  mask.addEventListener("mousemove", redispatchMouseEvent);
  mask.addEventListener("mouseup", redispatchMouseEvent);
  mask.addEventListener("mousedown", redispatchMouseEvent);

  document.addEventListener('fullscreenchange', handleFullscreenChange);

  chrome.runtime.sendMessage("inner_started");
  document.addEventListener("unload", () => {
    chrome.runtime.sendMessage("inner_stopped");
  });
}

function handleDocumentLoaded() {
  chrome.runtime.sendMessage("inner_loaded", response => {
    const needsToStart = response.status;
    if (needsToStart) {
      width = response.data.width;
      height = response.data.height;
      if (!width || !height) return;

      const c = document.getElementById("canvas");
      if (c) {
        processTargetCanvas(c);
        return;
      }

      observer = new MutationObserver(mutations => {
        let started = false;
        for (var mutation of mutations) {
          for (var child of mutation.addedNodes) {
            if (child.id === "canvas") {
              processTargetCanvas(child);
              started = true;
              observer.disconnect();
              break;
            }
          }
          if (started) break;
        }
      });
      observer.observe(document.body, {childList: true, subtree: true});
    }
  });
}

if (document.readyState === "interactive" || document.readyState === "complete") {
  handleDocumentLoaded();
} else {
  document.addEventListener("DOMContentLoaded", handleDocumentLoaded, true);
}
