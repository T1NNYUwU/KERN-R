import { get, set, del, keys } from 'idb-keyval'

// Prefix keys with userId to isolate data between users
const getKey = (userId: string, id: string) => `user-${userId}-media-${id}`

export async function saveMediaFile(userId: string, id: string, file: File) {
  await set(getKey(userId, id), file)
}

export async function getMediaFile(userId: string, id: string): Promise<File | undefined> {
  return await get(getKey(userId, id))
}

export async function deleteMediaFile(userId: string, id: string) {
  await del(getKey(userId, id))
}

export async function getAllMediaIds(userId: string): Promise<string[]> {
  const allKeys = await keys()
  const prefix = `user-${userId}-media-`
  return allKeys
    .filter(k => typeof k === 'string' && k.startsWith(prefix))
    .map(k => (k as string).replace(prefix, ''))
}
