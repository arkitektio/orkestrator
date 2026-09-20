// @vitest-environment jsdom
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { MockLink, type MockedResponse } from "@apollo/client/testing";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The picker's two jobs beyond listing: show folders where they hang (the
 * tree, loaded a level at a time) and make a folder on the spot, filing the
 * subject into it in the same breath.
 *
 * The generated hooks take their client from `useMikro()`, so the context is
 * mocked with a real client over a MockLink; the dialog context is mocked
 * because `@/app/dialog` pulls in the whole registry.
 */

const closeDialog = vi.fn();
vi.mock("@/app/dialog", () => ({
  useDialog: () => ({ closeDialog, openDialog: vi.fn(), openSheet: vi.fn() }),
}));

let client: ApolloClient<unknown>;
vi.mock("@/app/Arkitekt", () => ({
  useMikro: () => client,
}));

import {
  CreateFolderDocument,
  GetFoldersDocument,
  Ordering,
  PutFilesInFolderDocument,
} from "@/mikro-next/api/graphql";
import { Dialog } from "@/components/ui/dialog";
import { MoveToFolderForm } from "./MoveToFolderForm";

const folder = (id: string, name: string) => ({
  __typename: "Folder" as const,
  id,
  name,
  description: null,
  isDefault: false,
});

const level = (filters: object, folders: unknown[]): MockedResponse => ({
  request: {
    query: GetFoldersDocument,
    variables: { filters, ordering: [{ name: Ordering.Asc }], pagination: { limit: 200 } },
  },
  result: { data: { folders } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const mount = (mocks: MockedResponse[], props: Partial<React.ComponentProps<typeof MoveToFolderForm>> = {}) => {
  client = new ApolloClient({ link: new MockLink(mocks), cache: new InMemoryCache() });
  // The header primitives need a Dialog root for context; no content, so no portal.
  return render(
    <Dialog open>
      <MoveToFolderForm subject={{ kind: "file", ids: ["f-1"] }} {...props} />
    </Dialog>,
  );
};

beforeEach(() => closeDialog.mockClear());

describe("MoveToFolderForm", () => {
  it("shows the roots and loads a folder's children when it is opened", async () => {
    mount([
      level({ parentless: true }, [folder("a", "Alpha"), folder("b", "Beta")]),
      level({ parent: "a" }, [folder("a1", "Alpha / One")]),
      level({ parent: "b" }, []),
    ]);
    expect(await screen.findByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.queryByText("Alpha / One")).toBeNull();

    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Expand" })[0]);
    expect(await screen.findByText("Alpha / One")).toBeTruthy();

    await user.click(screen.getAllByRole("button", { name: "Expand" })[0]);
    expect(await screen.findByText("No subfolders")).toBeTruthy();
  });

  it("creates a folder under the chosen parent and moves the subject into it", async () => {
    const created = vi.fn(() => ({
      data: { createFolder: { __typename: "Folder", id: "n", name: "Fresh" } },
    }));
    const moved = vi.fn(() => ({
      data: { putFilesInFolder: { __typename: "Folder", id: "n", name: "Fresh", description: null, provenanceEntries: [], files: [], children: [], parent: null, isDefault: false, pinned: false, createdAt: "2026-09-20T00:00:00Z", creator: null, tags: [] } },
    }));
    mount([
      level({ parentless: true }, [folder("a", "Alpha")]),
      level({ parent: "a" }, []),
      {
        request: { query: CreateFolderDocument, variables: { input: { name: "Fresh", parent: "a" } } },
        result: created,
      },
      {
        request: { query: PutFilesInFolderDocument, variables: { selfs: ["f-1"], other: "n" } },
        result: moved,
      },
    ]);
    const user = userEvent.setup();
    await screen.findByText("Alpha");

    await user.click(screen.getByRole("button", { name: "New folder in Alpha" }));
    await user.type(screen.getByLabelText("New folder name"), "Fresh{Enter}");

    await waitFor(() => expect(moved).toHaveBeenCalled());
    expect(created).toHaveBeenCalled();
    await waitFor(() => expect(closeDialog).toHaveBeenCalled());
  });

  it("opens straight into naming a root folder when asked", async () => {
    mount([level({ parentless: true }, [])], { startCreating: true });
    expect(await screen.findByLabelText("New folder name")).toBeTruthy();
  });
});
