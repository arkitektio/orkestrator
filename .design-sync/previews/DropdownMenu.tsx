import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuGroup,
  Button,
} from 'orkestrator';
import { Pencil, Copy, Trash2, Share2, Tag, MoreHorizontal } from 'lucide-react';

export function RowActions() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 16px' }}>
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent style={{ minWidth: 200 }}>
          <DropdownMenuLabel>Run #1042</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Pencil />
              Edit
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy />
              Duplicate
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Share2 />
                Share
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>
                  <Tag />
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem>Email</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>Show annotations</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2 />
            Delete
            <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
