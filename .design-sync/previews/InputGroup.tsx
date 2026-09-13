import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from 'orkestrator';
import { Search, X, AtSign } from 'lucide-react';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: 280 };

export function WithLeadingIcon() {
  return (
    <div style={col}>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <Search />
        </InputGroupAddon>
        <InputGroupInput placeholder="Search nodes…" />
      </InputGroup>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <AtSign />
        </InputGroupAddon>
        <InputGroupInput placeholder="username" />
      </InputGroup>
    </div>
  );
}

export function WithTrailingButton() {
  return (
    <div style={col}>
      <InputGroup>
        <InputGroupInput defaultValue="workflow-run-042" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton>
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <Search />
        </InputGroupAddon>
        <InputGroupInput placeholder="Filter by tag…" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton>Clear</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function WithTextAddon() {
  return (
    <div style={col}>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="api.lab.org" />
      </InputGroup>
    </div>
  );
}

export function WithTextarea() {
  return (
    <div style={{ width: 280 }}>
      <InputGroup>
        <InputGroupAddon align="block-start">
          <InputGroupText>Notes</InputGroupText>
        </InputGroupAddon>
        <InputGroupTextarea placeholder="Describe this run…" />
      </InputGroup>
    </div>
  );
}
