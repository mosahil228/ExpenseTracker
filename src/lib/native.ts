import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const isNative = Capacitor.isNativePlatform()

export function tap(kind: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (!isNative) return
  const p =
    kind === 'success'
      ? Haptics.notification({ type: NotificationType.Success })
      : kind === 'warning'
        ? Haptics.notification({ type: NotificationType.Warning })
        : Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light })
  p.catch(() => {})
}

/** Save a file: share sheet on Android (Drive, WhatsApp, Files…), download in a browser. */
export async function saveFile(name: string, base64: string, mime: string) {
  if (isNative) {
    const res = await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache })
    await Share.share({ title: name, files: [res.uri] })
    return
  }
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export const textToBase64 = (s: string) => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}
