import { useGroupStore } from '@/stores/groupStore'

export function useCurrentGroup() {
  const { currentGroupId, currentGroupName, setCurrentGroup, clearCurrentGroup } = useGroupStore()
  return { currentGroupId, currentGroupName, setCurrentGroup, clearCurrentGroup }
}
