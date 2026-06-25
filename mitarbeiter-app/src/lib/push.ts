import { pb } from './pb'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC ?? ''

export async function subscribePush(employeeId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })

    const json = sub.toJSON()
    await pb.collection('push_subscriptions').create({
      employee: employeeId,
      endpoint: json.endpoint,
      p256dh:   json.keys?.p256dh ?? '',
      auth:     json.keys?.auth   ?? '',
      user_agent: navigator.userAgent.slice(0, 200),
    })

    return true
  } catch {
    return false
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  const bytes   = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}
