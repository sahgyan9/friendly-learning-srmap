import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NoIndex from "./NoIndex";
import RouteRobots from "./RouteRobots";

const robots = () => document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content;

describe("NoIndex", () => {
  it("wins over RouteRobots when both mount in the same commit, in either order", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/faculty/does-not-exist"]}>
        <NoIndex />
        <RouteRobots />
      </MemoryRouter>,
    );
    expect(robots()).toBe("noindex, follow");
    unmount();

    render(
      <MemoryRouter initialEntries={["/faculty/does-not-exist"]}>
        <RouteRobots />
        <NoIndex />
      </MemoryRouter>,
    );
    expect(robots()).toBe("noindex, follow");
  });

  it("restores indexing when the not-found state goes away", () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/blogs/some-post"]}>
        <RouteRobots />
        <NoIndex />
      </MemoryRouter>,
    );
    expect(robots()).toBe("noindex, follow");

    rerender(
      <MemoryRouter initialEntries={["/blogs/some-post"]}>
        <RouteRobots />
      </MemoryRouter>,
    );
    expect(robots()).toMatch(/^index, follow/);
    expect(document.documentElement.hasAttribute("data-noindex-hold")).toBe(false);
  });
});
