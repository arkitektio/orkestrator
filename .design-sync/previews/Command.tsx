import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from 'orkestrator';
import { Play, Plus, Search, Settings, Download, Trash2, FileText } from 'lucide-react';

export function CommandPalette() {
  return (
    <Command style={{ width: 320, border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
      <CommandInput placeholder="Search actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Run">
          <CommandItem>
            <Play />
            Start new run
            <CommandShortcut>⌘↵</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Plus />
            New workflow
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Download />
            Export results
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem>
            <FileText />
            Open logs
            <CommandShortcut>⌘L</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Search />
            Search datasets
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Settings />
            Settings
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Danger zone">
          <CommandItem>
            <Trash2 />
            Delete run
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function CommandWithSelection() {
  return (
    <Command style={{ width: 320, border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
      <CommandInput placeholder="Filter models…" />
      <CommandList>
        <CommandEmpty>No models found.</CommandEmpty>
        <CommandGroup heading="Available models">
          <CommandItem data-checked="true">
            ResNet-50
            <CommandShortcut>default</CommandShortcut>
          </CommandItem>
          <CommandItem>VGG-16</CommandItem>
          <CommandItem>EfficientNet-B4</CommandItem>
          <CommandItem disabled>CLIP (unavailable)</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
