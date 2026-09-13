import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from 'orkestrator';
import { Globe } from 'lucide-react';

export function RegionSelect() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 16px' }}>
      <Select defaultOpen defaultValue="us-east">
        <SelectTrigger style={{ minWidth: 180 }}>
          <Globe style={{ width: 12, height: 12, opacity: 0.7 }} />
          <SelectValue placeholder="Select region…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>North America</SelectLabel>
            <SelectItem value="us-east">US East (N. Virginia)</SelectItem>
            <SelectItem value="us-west">US West (Oregon)</SelectItem>
            <SelectItem value="ca-central">Canada (Central)</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Europe</SelectLabel>
            <SelectItem value="eu-west">EU West (Ireland)</SelectItem>
            <SelectItem value="eu-central">EU Central (Frankfurt)</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Asia Pacific</SelectLabel>
            <SelectItem value="ap-northeast">AP Northeast (Tokyo)</SelectItem>
            <SelectItem value="ap-southeast">AP Southeast (Singapore)</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
