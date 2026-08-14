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
    expect(screen.getByRole("tab", { name: "肝不全・ACLF" })).toBeVisible();
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

  it("shows AIH treatment references without a redundant confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("tab", { name: "AIH 2021" }));
    await user.click(screen.getByRole("button", { name: "治療の記載" }));

    expect(
      screen.getByRole("heading", { name: "第一選択治療と体重換算" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("checkbox", { name: /AIHとして/ }),
    ).not.toBeInTheDocument();
  });

  it("shows transplant-facility context for the acute liver failure demo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "症例一覧" }));
    await user.click(
      screen.getByRole("button", {
        name: "昏睡型急性肝不全・移植連携表示",
      }),
    );
    await user.click(screen.getByRole("tab", { name: "肝不全・ACLF" }));

    expect(
      screen.getByRole("heading", {
        name: "昏睡型急性肝不全・LOHFと移植評価",
      }),
    ).toBeVisible();
    expect(screen.getByText(/自施設で肝移植を実施しない/)).toBeVisible();
  });
});
