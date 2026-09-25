// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./dialog";
import { ActionTrigger } from "./page-action";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { resolveTriggerAsChild } from "./trigger-child";

const Plain = (props: { children?: React.ReactNode }) => <span>{props.children}</span>;

describe("resolveTriggerAsChild", () => {
  it("takes over a lone button", () => {
    expect(resolveTriggerAsChild(undefined, <Button>x</Button>)).toBe(true);
    expect(resolveTriggerAsChild(undefined, <ActionTrigger>x</ActionTrigger>)).toBe(true);
    expect(resolveTriggerAsChild(undefined, <button>x</button>)).toBe(true);
  });

  it("leaves everything else wrapped", () => {
    expect(resolveTriggerAsChild(undefined, "Open")).toBe(false);
    expect(resolveTriggerAsChild(undefined, <span>x</span>)).toBe(false);
    expect(resolveTriggerAsChild(undefined, <Plain>x</Plain>)).toBe(false);
    expect(
      resolveTriggerAsChild(
        undefined,
        <>
          <Button>a</Button>
        </>,
      ),
    ).toBe(false);
    expect(resolveTriggerAsChild(undefined, [<Button key="a">a</Button>, <Button key="b">b</Button>])).toBe(
      false,
    );
  });

  it("lets the caller decide", () => {
    expect(resolveTriggerAsChild(false, <Button>x</Button>)).toBe(false);
    expect(resolveTriggerAsChild(true, <Plain>x</Plain>)).toBe(true);
  });
});

describe("trigger wrappers", () => {
  it("draw one button around a Button and still open", async () => {
    render(
      <Popover>
        <PopoverTrigger>
          <Button>Open</Button>
        </PopoverTrigger>
        <PopoverContent>Inside</PopoverContent>
      </Popover>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("Inside")).toBeInTheDocument();
  });

  it("take over an ActionTrigger in a dialog", async () => {
    render(
      <Dialog>
        <DialogTrigger>
          <ActionTrigger>New Folder</ActionTrigger>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog body</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "New Folder" }));
    expect(await screen.findByText("Dialog body")).toBeInTheDocument();
  });

  it("still wrap plain content in their own button", () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Inside</PopoverContent>
      </Popover>,
    );
    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("data-slot", "popover-trigger");
  });
});
