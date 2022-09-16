import { addressChangeListener } from "~wallets/event";
import { handleTabUpdate } from "~applications/tab";
import { appsChangeListener } from "~applications";
import { getStorageConfig } from "~utils/storage";
import { Storage } from "@plasmohq/storage";
import { onMessage } from "webext-bridge";
import browser from "webextension-polyfill";
import handleApiCalls from "~api";

// TODO: handle chunks
// move chunks to a different message from "api_call"

// TODO: handle fee alarm (send fees asyncronously)

// TODO: open welcome page on extension install

// handle tab change (icon, context menus)
browser.tabs.onUpdated.addListener((tabId) => handleTabUpdate(tabId));
browser.tabs.onActivated.addListener(({ tabId }) => handleTabUpdate(tabId));

// TODO: save decryption key here if the extension is
// running in firefox. firefox still uses manifest v2,
// so it should allow us, to store the decryption key
// in the background scipt and have it destroyed once
// the browser is closed

// watch for API calls
onMessage("api_call", handleApiCalls);

// create storage client
const storage = new Storage(getStorageConfig());

// watch for active address changes / app
// list changes
// and send them to the content script to
// fire the wallet switch event
storage.watch({
  active_address: addressChangeListener,
  apps: appsChangeListener
});

export {};
