import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("application shell", () => {
  it("renders the implemented clinical modules", async () => {
    render(<App />);
    expect(
      await screen.findByRole("tab", { name: "共通スコア" }),
    ).toBeVisible();
    expect(screen.getByRole("tab", { name: "AIH 2021" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "肝不全・ACLF" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "HBV 第5版" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "HCV 8.4" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "ALD 2022" })).toBeVisible();
  });

  it("shows HBV chronic hepatitis treatment correspondence", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "症例一覧" }));
    await user.click(
      screen.getByRole("button", { name: "HBV慢性肝炎増悪・治療対象" }),
    );
    await user.click(screen.getByRole("tab", { name: "HBV 第5版" }));
    expect(
      screen.getByText("治療対象の数値条件に対応", { exact: true }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "初回治療の選択肢" }),
    ).toBeVisible();
  });

  it("shows HCV decompensated cirrhosis treatment reference", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "症例一覧" }));
    await user.click(
      screen.getByRole("button", { name: "HCV非代償性肝硬変・DAA候補" }),
    );
    await user.click(screen.getByRole("tab", { name: "HCV 8.4" }));
    expect(screen.getByRole("heading", { name: "SOF/VEL" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "非代償性肝硬変とChild-Pugh" }),
    ).toBeVisible();
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

  it("shows ACLF entry and organ-failure correspondence from separate timepoints", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "症例一覧" }));
    await user.click(
      screen.getByRole("button", { name: "ACLF国内基準・6臓器条件" }),
    );
    await user.click(screen.getByRole("tab", { name: "肝不全・ACLF" }));

    expect(
      screen.getByRole("heading", { name: "ACLF診断基準との対応" }),
    ).toBeVisible();
    expect(screen.getByText("7点 / Class B")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "重症度分類に用いる臓器機能不全",
      }),
    ).toBeVisible();
  });
});
