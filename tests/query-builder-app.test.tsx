import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach } from "vitest";
import QueryBuilderApp from "../components/query-builder-app";

describe("query builder app", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("renders the recursive editor and supports adding groups and running a simulation", async () => {
    const user = userEvent.setup();
    render(<QueryBuilderApp />);

    expect(screen.getByText(/visual query builder/i)).toBeInTheDocument();

    const initialComboBoxes = screen.getAllByRole("combobox").length;
    await user.click(screen.getAllByRole("button", { name: /\+ rule/i })[0]);
    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(
      initialComboBoxes,
    );

    await user.click(screen.getByRole("button", { name: /mongo/i }));
    expect(screen.getByText(/"\$or"/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /run simulation/i }));

    await waitFor(() => {
      const historyLabel = screen.getByText(/history items/i);
      expect(historyLabel.previousElementSibling).toHaveTextContent("1");
    });
  });
});
