let observer = null;

function startAndListenToStop() {
  chrome.runtime.sendMessage("outer_started");
  document.addEventListener("unload", () => {
    chrome.runtime.sendMessage("outer_stopped");
  });
}

function processTargetFrame(frame) {
  if (frame.getAttribute("allowfullscreen") !== "true") {
    frame.setAttribute("allowfullscreen", "true");
    const originalSrc = frame.src;
    frame.src = "";
    // It seems that `allowfullscreen` attribute does not work immediately after
    // added on Chrome. A workaround is clear `src` to empty and set back again.
    setTimeout(() => {
      frame.src = originalSrc;
      startAndListenToStop();
    }, 100);
  } else {
    startAndListenToStop();
  }
}

function handleDocumentLoaded() {
  chrome.runtime.sendMessage("outer_loaded", response => {
    const needsToStart = response.status;
    if (needsToStart) {
      let targetFrameId = response.data.targetFrameId;
      if (!targetFrameId) return;

      const targetFrame = document.getElementById(targetFrameId);
      if (targetFrame) {
        processTargetFrame(targetFrame);
        return;
      }

      observer = new MutationObserver(mutations => {
        let started = false;
        for (var mutation of mutations) {
          for (var child of mutation.addedNodes) {
            if (child.id === targetFrameId) {
              processTargetFrame(child);
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
