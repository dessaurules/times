import PocketBase from 'pocketbase'

export const pb = new PocketBase(
  import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8091'
)

// SSO: Bei ungültigem Token automatisch logout
// useAuthStore wird lazy importiert um Circular-Dependency zu vermeiden
// (stores/auth.ts importiert bereits pb aus dieser Datei)
pb.authStore.onChange(async () => {
  if (!pb.authStore.isValid) {
    const { useAuthStore } = await import('../stores/auth')
    useAuthStore.getState().logout()
  }
})
