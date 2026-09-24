import GamificationTaskListSimple from '@/components/Gamification/GamificationTaskListSimple'

export default function GameTasksTest() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">🧪 Tasks Test (OHNE Subscribe)</h1>
      <p className="text-gray-600">Diese Komponente ladet OHNE Subscribe - wenn das funktioniert, ist das Problem der Subscribe!</p>
      <GamificationTaskListSimple />
    </div>
  )
}
