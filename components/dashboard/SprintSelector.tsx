'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Sprint {
  id: number;
  name: string;
  state: string;
  startDate: string;
  endDate: string;
  completeDate?: string;
}

interface SprintSelectorProps {
  sprints: Sprint[];
  selectedMode: string; // Sprint ID as string
  onModeChange: (sprintId: string) => void;
  loading?: boolean;
}

export default function SprintSelector({ sprints, selectedMode, onModeChange, loading }: SprintSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Sprint:</span>
      <Select value={selectedMode} onValueChange={onModeChange} disabled={loading}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select sprint" />
        </SelectTrigger>
        <SelectContent>
          {sprints.map((sprint) => (
            <SelectItem key={sprint.id} value={sprint.id.toString()}>
              {sprint.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
