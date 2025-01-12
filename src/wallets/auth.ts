import { decryptWallet, freeDecryptedWallet } from "./encryption";
import browser, { type Alarms } from "webextension-polyfill";
import { getWallets, type LocalWallet } from "./index";
import { ExtensionStorage } from "~utils/storage";

/**
 * Name of the store that holds the expiration date
 * for the current password.
 */
export const EXPIRATION_STORAGE = "password_expires";

/**
 * Unlock wallets and save decryption key
 *
 * **Warning**: SHOULD ONLY BE CALLED FROM THE AUTH/POPUP VIEW / VIEWS
 *
 * @param password Password for unlocking
 */
export async function unlock(password: string) {
  // validate password
  if (!(await checkPassword(password))) {
    return false;
  }

  // save decryption key
  await setDecryptionKey(password);

  // schedule the key for removal
  await scheduleKeyRemoval();

  // add expiration if needed
  await addExpiration();

  return true;
}

/**
 * Check password against decryption key
 * or try to decrypt with it.
 *
 * @param password Password to check
 */
export async function checkPassword(password: string) {
  let decryptionKey = await getDecryptionKey();

  if (!!decryptionKey) {
    return decryptionKey === password;
  }

  // try decrypting
  const wallets = await getWallets();
  const localWallets = wallets.filter(
    (w) => w.type === "local"
  ) as LocalWallet[];

  // if there are no wallets, this is a new password
  if (localWallets.length === 0) {
    return true;
  }

  try {
    // try decrypting the wallet
    const wallet = await decryptWallet(localWallets[0].keyfile, password);

    // remove wallet from memory
    freeDecryptedWallet(wallet);

    return true;
  } catch {
    return false;
  }
}

/**
 * Get wallet decryption key
 */
export async function getDecryptionKey() {
  const val = await ExtensionStorage.get("decryption_key");

  // check if defined
  if (!val) {
    return undefined;
  }

  return atob(val);
}

export async function isExpired() {
  const val = await ExtensionStorage.get<number>(EXPIRATION_STORAGE);

  // expired
  if (Date.now() > val || !val) {
    return true;
  }
}

/**
 * Set wallet decryption key
 *
 * @param val Decryption key to set
 */
export async function setDecryptionKey(val: string) {
  return await ExtensionStorage.set("decryption_key", btoa(val));
}

/**
 * Remove decryption key
 */
export async function removeDecryptionKey() {
  return await ExtensionStorage.remove("decryption_key");
}

/**
 * Schedule removing the decryption key.
 * Removal occurs after one day.
 */
async function scheduleKeyRemoval() {
  // schedule removal of the key for security reasons
  browser.alarms.create("remove_decryption_key_scheduled", {
    periodInMinutes: 60 * 24
  });
}

/**
 * Listener for the key removal alarm
 */
export async function keyRemoveAlarmListener(alarm: Alarms.Alarm) {
  if (alarm.name !== "remove_decryption_key_scheduled") return;

  // check if there is a decryption key
  const decryptionKey = await getDecryptionKey();
  if (!decryptionKey) return;

  // remove the decryption key
  await removeDecryptionKey();
}

/**
 * Listener for browser close.
 * On browser closed, we remove the
 * decryptionKey.
 */
export async function onWindowClose() {
  const windows = await browser.windows.getAll();

  // return if there are still windows open
  if (windows.length > 0) {
    return;
  }

  // remove the decryption key
  await removeDecryptionKey();
}

/**
 * Add password expiration date, if it is
 * not in the extension storage yet.
 */
export async function addExpiration() {
  // add expiration date for password if not present
  let expires = await ExtensionStorage.get<number>(EXPIRATION_STORAGE);

  if (!expires) {
    const newExpiration = new Date();

    // set expiration date in 6 months
    newExpiration.setMonth(newExpiration.getMonth() + 6);
    expires = newExpiration.getTime();

    // set value
    await ExtensionStorage.set(EXPIRATION_STORAGE, expires);

    // schedule session reset once the password expired
    browser.alarms.create("remove_decryption_key_scheduled", {
      when: expires
    });
  }
}
