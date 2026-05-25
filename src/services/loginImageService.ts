export const LOGIN_IMAGE_STORAGE_KEY = 'aisura-login-image'
export const DEFAULT_LOGIN_IMAGE = '/images/login-illustration.png'

export function getStoredLoginImage(storage: Pick<Storage, 'getItem'> = localStorage) {
  return storage.getItem(LOGIN_IMAGE_STORAGE_KEY) || DEFAULT_LOGIN_IMAGE
}

export function setStoredLoginImage(dataUrl: string, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(LOGIN_IMAGE_STORAGE_KEY, dataUrl)
  return dataUrl
}

export function resetStoredLoginImage(storage: Pick<Storage, 'removeItem'> = localStorage) {
  storage.removeItem(LOGIN_IMAGE_STORAGE_KEY)
  return DEFAULT_LOGIN_IMAGE
}
