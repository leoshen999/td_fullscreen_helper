function determineGameType(rawUrl) {
  let url = rawUrl.split(/[?#]/)[0];
  if (!url.endsWith("/")) url = url + "/";

  if (url === "http://pc-play.games.dmm.com/play/oshirore/")
    return "oshiro";
  else if (url === "http://pc-play.games.dmm.com/play/aigisc/")
    return "aigis";
  return "";
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;

  let gameType = determineGameType(changeInfo.url);

  const key = tabId.toString();
  chrome.storage.local.get(key, result => {
    if (gameType === "") {
      chrome.action.disable(tabId);
      if (key in result) {
        chrome.storage.local.remove(key);
      }
    } else {
      if (!(key in result)) {
        chrome.storage.local.set({
          [key]: {outer: null, inner: null},
        });
      }
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const key = tabId.toString();
  chrome.storage.local.get(key, result => {
    if (key in result) {
      chrome.storage.local.remove(key);
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  let gameType = determineGameType(sender.tab.url);
  const response = {
    status: false,
    data: {},
  };

  if (gameType === "") {
    sendResponse(response);
    return;
  }

  const tabId = sender.tab.id;
  const key = tabId.toString();
  chrome.storage.local.get(key, result => {
    const isValid = (key in result);

    if (isValid) {
      response.status = true;
      const storageEntry = result[key];
      let needsUpdateStorage = false;

      if (request === "outer_loaded") {
        if (gameType === "oshiro") {
          response.data.targetFrameId = "oshiro";
        } else if (gameType === "aigis") {
          response.data.targetFrameId = "aigis";
        } else {
          // TODO: Log error
        }
      } else if (request === "inner_loaded") {
        if (gameType === "oshiro") {
          response.data.width = 1280;
          response.data.height = 720;
        } else if (gameType === "aigis") {
          response.data.width = 960;
          response.data.height = 640;
        } else {
          // TODO: Log error
        }
      } else if (request === "outer_started") {
        storageEntry.outer = sender.frameId;
        needsUpdateStorage = true;
      } else if (request === "outer_stopped"){
        storageEntry.outer = null;
        needsUpdateStorage = true;
      } else if (request === "inner_started") {
        storageEntry.inner = sender.frameId;
        needsUpdateStorage = true;
      } else if (request === "inner_stopped") {
        storageEntry.inner = null;
        needsUpdateStorage = true;
      } else {
        // TODO: Log error
      }

      if (needsUpdateStorage) {
        chrome.storage.local.set({
          [key]: storageEntry,
        });
      }

      if (storageEntry.outer && storageEntry.inner) {
        chrome.action.enable(tabId);
      } else {
        chrome.action.disable(tabId);
      }
    }

    sendResponse(response);
  });

  return true;
});

chrome.action.onClicked.addListener(tab => {
  const key = tab.id.toString();
  chrome.storage.local.get(key, result => {
    if (!(key in result)) return;

    const storageEntry = result[key];
    if (!storageEntry.outer || !storageEntry.inner)
      return;

    chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [storageEntry.inner] },
      function: requestFullscreen,
    });
  });
});

function requestFullscreen() {
  let canvas = document.querySelector("#canvas");
  if (canvas && canvas.parentElement)
    canvas.parentElement.requestFullscreen();
}
