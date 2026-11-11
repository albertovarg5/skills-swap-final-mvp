import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "../App";
import { SkillsProvider } from "../context/SkillsContext";
import * as bookService from "../services/bookService";

// Render the whole app at a given URL, with the real Context provider.
function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SkillsProvider>
        <App />
      </SkillsProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  // Never call the real API in tests.
  vi.spyOn(bookService, "fetchBooks").mockResolvedValue([
    { key: "/works/1", title: "Eloquent JavaScript", author_name: ["Marijn Haverbeke"], cover_i: 123 },
  ]);
});

describe("rendering", () => {
  it("shows the home page and navigation", () => {
    renderApp("/");
    expect(screen.getByText("Share Your Skills. Learn Something New.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse" })).toBeInTheDocument();
  });

  it("shows sample skills on the browse page", () => {
    renderApp("/skills");
    expect(screen.getByText("JavaScript Help")).toBeInTheDocument();
    expect(screen.getByText("Spanish Lessons")).toBeInTheDocument();
  });

  it("shows the 404 page for unknown routes", () => {
    renderApp("/nope");
    expect(screen.getByText(/404/)).toBeInTheDocument();
  });
});

describe("search and filter", () => {
  it("filters by keyword", async () => {
    renderApp("/skills");
    await userEvent.type(screen.getByLabelText("Search"), "guitar");
    expect(screen.getByText("Guitar for Beginners")).toBeInTheDocument();
    expect(screen.queryByText("Spanish Lessons")).not.toBeInTheDocument();
  });

  it("filters by category", async () => {
    renderApp("/skills");
    await userEvent.selectOptions(screen.getByLabelText("Category"), "Languages");
    expect(screen.getByText("Spanish Lessons")).toBeInTheDocument();
    expect(screen.queryByText("JavaScript Help")).not.toBeInTheDocument();
  });

  it("shows a message when nothing matches", async () => {
    renderApp("/skills");
    await userEvent.type(screen.getByLabelText("Search"), "zzzzz");
    expect(screen.getByText("No skills match your search.")).toBeInTheDocument();
  });
});

describe("saving skills (Context)", () => {
  it("saves and unsaves a skill", async () => {
    renderApp("/skills");
    const card = screen.getByText("JavaScript Help").closest("article");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(within(card).getByRole("button", { name: "Unsave" })).toBeInTheDocument();
    await userEvent.click(within(card).getByRole("button", { name: "Unsave" }));
    expect(within(card).getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("shares saved skills across pages", async () => {
    renderApp("/skills");
    const card = screen.getByText("Spanish Lessons").closest("article");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    // The navbar count comes from the same Context.
    await userEvent.click(screen.getByRole("link", { name: "Saved (1)" }));
    expect(screen.getByText("Spanish Lessons")).toBeInTheDocument();
    expect(screen.queryByText("JavaScript Help")).not.toBeInTheDocument();
  });

  it("shows an empty message when nothing is saved", () => {
    renderApp("/saved");
    expect(screen.getByText("You have not saved any skills yet.")).toBeInTheDocument();
  });
});

describe("adding skills", () => {
  it("adds a skill and lists it under My Skills", async () => {
    renderApp("/my-skills");
    await userEvent.type(screen.getByLabelText("Title"), "Chess Lessons");
    await userEvent.type(screen.getByLabelText("Description"), "Learn openings.");
    await userEvent.click(screen.getByRole("button", { name: "Add Skill" }));
    expect(screen.getByText("Chess Lessons")).toBeInTheDocument();
  });

  it("shows an error if the form is empty", async () => {
    renderApp("/my-skills");
    await userEvent.click(screen.getByRole("button", { name: "Add Skill" }));
    expect(screen.getByText("Please enter a title and a description.")).toBeInTheDocument();
  });
});

describe("related books (API)", () => {
  it("shows books on the skill details page", async () => {
    renderApp("/skills/1");
    expect(screen.getByText("Loading books...")).toBeInTheDocument();
    expect(await screen.findByText("Eloquent JavaScript")).toBeInTheDocument();
    expect(screen.getByText("Marijn Haverbeke")).toBeInTheDocument();
  });

  it("shows a friendly message when there are no books", async () => {
    bookService.fetchBooks.mockResolvedValue([]);
    renderApp("/skills/1");
    expect(await screen.findByText("No related books found for this skill.")).toBeInTheDocument();
  });

  it("shows an error message when the API fails", async () => {
    bookService.fetchBooks.mockRejectedValue(new Error("fail"));
    renderApp("/skills/1");
    expect(await screen.findByText(/could not load related books/)).toBeInTheDocument();
  });
});
