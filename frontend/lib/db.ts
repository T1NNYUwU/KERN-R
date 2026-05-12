import { get, set, del, keys } from 'idb-keyval'

export async function saveMediaFile(id: string, file: File) {
  await set(`media-${id}`, file)
}

export async function getMediaFile(id: string): Promise<File | undefined> {
  return await get(`media-${id}`)
}

export async function deleteMediaFile(id: string) {
  await del(`media-${id}`)
}

export async function getAllMediaIds(): Promise<string[]> {
  const allKeys = await keys()
  return allKeys.filter(k => typeof k === 'string' && k.startsWith('media-')).map(k => (k as string).replace('media-', ''))
}
