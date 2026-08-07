import { useState } from 'react'
import { Sheet, SheetHeader, SheetTitle, SheetClose, SheetBody } from '../ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { GamificationTaskList } from './GamificationTaskList'
import { GamificationAssignments } from './GamificationAssignments'
import { GamificationShop } from './GamificationShop'
import { GamificationFeed } from './GamificationFeed'

interface GamificationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GamificationSheet({ open, onOpenChange }: GamificationSheetProps) {
  const [activeTab, setActiveTab] = useState('available')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader>
        <SheetTitle>Gamification</SheetTitle>
        <SheetClose onOpenChange={onOpenChange} />
      </SheetHeader>
      <SheetBody className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="px-5 pt-3 sticky top-0 bg-white z-10">
            <TabsTrigger value="available">Verfügbar</TabsTrigger>
            <TabsTrigger value="active">Aktiv</TabsTrigger>
            <TabsTrigger value="shop">Shop</TabsTrigger>
            <TabsTrigger value="activity">Aktivität</TabsTrigger>
          </TabsList>

          <div className="px-5 py-4">
            <TabsContent value="available">
              <GamificationTaskList />
            </TabsContent>

            <TabsContent value="active">
              <GamificationAssignments />
            </TabsContent>

            <TabsContent value="shop">
              <GamificationShop />
            </TabsContent>

            <TabsContent value="activity">
              <GamificationFeed />
            </TabsContent>
          </div>
        </Tabs>
      </SheetBody>
    </Sheet>
  )
}
