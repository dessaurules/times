import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

const useTabsContext = () => {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error('useTabsContext must be used within a Tabs component')
  }
  return context
}

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        'flex gap-4 border-b border-[#E5E7EB]',
        className
      )}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
}

function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { value: activeValue, onValueChange } = useTabsContext()
  const isActive = activeValue === value

  return (
    <button
      onClick={() => onValueChange(value)}
      className={cn(
        'px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors',
        isActive
          ? 'border-[#4F46E5] text-[#4F46E5]'
          : 'border-transparent text-[#6B7280] hover:text-[#111827]',
        className
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: activeValue } = useTabsContext()

  if (activeValue !== value) {
    return null
  }

  return (
    <div className={className}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
