import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the dashboard shell", () => {
  render(<App />);

  expect(screen.getByText(/infrastructure operations/i)).toBeInTheDocument();
  expect(screen.getByText(/overview/i)).toBeInTheDocument();
});
