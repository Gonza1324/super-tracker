import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GroupStore {
  currentGroupId: string | null
  currentGroupName: string | null
  setCurrentGroup: (id: string, name: string) => void
  clearCurrentGroup: () => void
}

export const useGroupStore = create<GroupStore>()(
  persist(
    (set) => ({
      currentGroupId: null,
      currentGroupName: null,
      setCurrentGroup: (id, name) => set({ currentGroupId: id, currentGroupName: name }),
      clearCurrentGroup: () => set({ currentGroupId: null, currentGroupName: null }),
    }),
    { name: 'super-tracker-group' }
  )
)
