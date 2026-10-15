// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { Zap } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { CommandActionIcon } from "./parts";

afterEach(cleanup);

describe("a row's icon", () => {
  it("is the row's own picture when it has one, in the icon's box", () => {
    const { container } = render(
      <CommandActionIcon icon={Zap} leading={<img alt="logo" data-testid="logo" />} />,
    );
    expect(container.querySelector('[data-testid="logo"]')).not.toBeNull();
    // The picture takes the icon's place, it does not sit beside it.
    expect(container.querySelector("svg")).toBeNull();
  });

  it("is the icon when the row has no picture", () => {
    const { container } = render(<CommandActionIcon icon={Zap} leading={undefined} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
