import {
  Item, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemMedia, ItemGroup,
  Button,
} from 'orkestrator';
import { FileText, Image, Archive, MoreHorizontal } from 'lucide-react';

export function FileList() {
  return (
    <ItemGroup style={{ width: 380 }}>
      <Item variant="outline">
        <ItemMedia variant="icon">
          <FileText />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>report-q2-2026.pdf</ItemTitle>
          <ItemDescription>Uploaded 2 hours ago · 4.2 MB</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="xs" variant="ghost"><MoreHorizontal /></Button>
        </ItemActions>
      </Item>
      <Item variant="outline">
        <ItemMedia variant="icon">
          <Image />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>microscopy-scan-001.tiff</ItemTitle>
          <ItemDescription>Uploaded yesterday · 128 MB</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="xs" variant="ghost"><MoreHorizontal /></Button>
        </ItemActions>
      </Item>
      <Item variant="outline">
        <ItemMedia variant="icon">
          <Archive />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>experiment-outputs.zip</ItemTitle>
          <ItemDescription>Uploaded 3 days ago · 512 MB</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="xs" variant="ghost"><MoreHorizontal /></Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  );
}

export function WithActions() {
  return (
    <ItemGroup style={{ width: 380 }}>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Production deploy</ItemTitle>
          <ItemDescription>Triggered by push to main · 4 min ago</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="xs" variant="outline">View logs</Button>
          <Button size="xs">Promote</Button>
        </ItemActions>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Staging deploy</ItemTitle>
          <ItemDescription>Triggered by PR #142 · 12 min ago</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="xs" variant="outline">View logs</Button>
          <Button size="xs">Promote</Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  );
}
