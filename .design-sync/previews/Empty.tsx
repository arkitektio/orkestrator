import {
  Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia,
  Button,
} from 'orkestrator';
import { Rocket, SearchX } from 'lucide-react';

export function NoDeployments() {
  return (
    <Empty style={{ width: 340 }}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Rocket />
        </EmptyMedia>
        <EmptyTitle>No deployments yet</EmptyTitle>
        <EmptyDescription>
          Push code to your repository or trigger a manual deploy to get started.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm">Deploy now</Button>
      </EmptyContent>
    </Empty>
  );
}

export function NoResults() {
  return (
    <Empty style={{ width: 320 }}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>
          Try adjusting your search or filters to find what you are looking for.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" variant="outline">Clear filters</Button>
      </EmptyContent>
    </Empty>
  );
}
