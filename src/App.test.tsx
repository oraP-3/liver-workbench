import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("application shell", () => {
  it("renders working modules without future empty tabs", async () => {
    render(<App />);
    expect(
      await screen.findByRole("tab", { name: "共通スコア" }),
    ).toBeVisible();
    expect(screen.getByRole("tab", { name: "AIH 2021" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "ALD 2022" })).toBeVisible();
    expect(screen.queryByRole("tab", { name: /HCV/ })).not.toBeInTheDocument();
  });

  it("collapses the complete input body", async () => {
    const user = userEvent.setup();
    render(<App />);
    const close = await screen.findByRole("button", { name: "入力を閉じる" });
    await user.click(close);
    expect(screen.getByRole("button", { name: "入力を開く" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
