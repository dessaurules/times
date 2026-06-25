import webpush from 'web-push'
import PocketBase from 'pocketbase'

const pb = new PocketBase(process.env.PB_URL ?? 'http://127.0.0.1:8091')

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC  ?? '',
  process.env.VAPID_PRIVATE ?? '',
)

async function ensureAuth() {
  if (!pb.authStore.isValid) {
    await pb.collection('_superusers').authWithPassword(
      process.env.PB_ADMIN_EMAIL    ?? '',
      process.env.PB_ADMIN_PASSWORD ?? '',
    )
  }
}

interface PushSubscription {
  id: string
  employee: string
  endpoint: string
  p256dh:   string
  auth:     string
}

export async function sendPushToEmployee(
  employeeId: string,
  title: string,
  body: string,
): Promise<void> {
  await ensureAuth()

  let subs: PushSubscription[]
  try {
    subs = await pb.collection('push_subscriptions').getFullList<PushSubscription>({
      filter: `employee = "${employeeId}"`,
      requestKey: null,
    })
  } catch {
    return
  }

  await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body }),
        )
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 410) {
          await pb.collection('push_subscriptions').delete(sub.id).catch(() => {})
        }
      }
    }),
  )
}

export { pb, ensureAuth }
