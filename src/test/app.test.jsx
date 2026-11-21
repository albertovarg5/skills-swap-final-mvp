import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import * as bookService from "../services/bookService";
import { startTestApi, signUpViaApi, renderApp } from "./helpers";

let backend;
beforeAll(async () => { backend = await startTestApi(); });
afterAll(() => backend.stop());

beforeEach(() => {
  backend.reset();
  // Never call the real Open Library API in tests.
  vi.spyOn(bookService, "fetchBooks").mockResolvedValue([
    { key: "/works/1", title: "Eloquent JavaScript", author_name: ["Marijn Haverbeke"], cover_i: 123 },
  ]);
});

// Helper: render a page as a logged-in student.
async function renderLoggedIn(path) {
  await signUpViaApi();
  renderApp(path);
}

describe("rendering", () => {
  it("shows the home page and navigation", () => {
    renderApp("/");
    expect(screen.getByText("Share Your Skills. Learn Something New.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse" })).toBeInTheDocument();
  });

  it("shows sample skills on the browse page", async () => {
    renderApp("/skills");
    expect(await screen.findByText("JavaScript Help")).toBeInTheDocument();
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
    await screen.findByText("Spanish Lessons");
    await userEvent.type(screen.getByLabelText("Search"), "guitar");
    expect(screen.getByText("Guitar for Beginners")).toBeInTheDocument();
    expect(screen.queryByText("Spanish Lessons")).not.toBeInTheDocument();
  });

  it("filters by category", async () => {
    renderApp("/skills");
    await screen.findByText("JavaScript Help");
    await userEvent.selectOptions(screen.getByLabelText("Category"), "Languages");
    expect(screen.getByText("Spanish Lessons")).toBeInTheDocument();
    expect(screen.queryByText("JavaScript Help")).not.toBeInTheDocument();
  });

  it("shows a message when nothing matches", async () => {
    renderApp("/skills");
    await screen.findByText("JavaScript Help");
    await userEvent.type(screen.getByLabelText("Search"), "zzzzz");
    expect(screen.getByText("No skills match your search.")).toBeInTheDocument();
  });
});

describe("saving skills (Context)", () => {
  it("saves and unsaves a skill", async () => {
    await renderLoggedIn("/skills");
    const card = (await screen.findByText("JavaScript Help")).closest("article");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(within(card).getByRole("button", { name: "Unsave" })).toBeInTheDocument();
    await userEvent.click(within(card).getByRole("button", { name: "Unsave" }));
    expect(within(card).getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("shares saved skills across pages", async () => {
    await renderLoggedIn("/skills");
    const card = (await screen.findByText("Spanish Lessons")).closest("article");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    // The navbar count comes from the same Context.
    await userEvent.click(screen.getByRole("link", { name: "Saved (1)" }));
    expect(await screen.findByText("Spanish Lessons")).toBeInTheDocument();
    expect(screen.queryByText("JavaScript Help")).not.toBeInTheDocument();
  });

  it("shows an empty message when nothing is saved", async () => {
    await renderLoggedIn("/saved");
    expect(await screen.findByText("You have not saved any skills yet.")).toBeInTheDocument();
  });

  it("keeps saved skills after a page refresh (saved on the server)", async () => {
    await renderLoggedIn("/skills");
    const card = (await screen.findByText("Guitar for Beginners")).closest("article");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: "Unsave" });
    document.body.innerHTML = ""; // "refresh": a new render, same cookie
    renderApp("/saved");
    expect(await screen.findByText("Guitar for Beginners")).toBeInTheDocument();
  });

  it("sends a logged-out visitor to the login page when they try to save", async () => {
    renderApp("/skills");
    const card = (await screen.findByText("JavaScript Help")).closest("article");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByText("Please log in to save skills.")).toBeInTheDocument();
  });

  it("undoes the change and shows an error if saving fails", async () => {
    await renderLoggedIn("/skills");
    const card = (await screen.findByText("JavaScript Help")).closest("article");
    await screen.findByText(/Hi, /);
    backend.failNext = 1;
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});

describe("adding skills", () => {
  it("adds a skill and lists it under My Skills", async () => {
    await renderLoggedIn("/my-skills");
    await userEvent.type(await screen.findByLabelText("Title"), "Chess Lessons");
    await userEvent.type(screen.getByLabelText("Description"), "Learn openings.");
    await userEvent.click(screen.getByRole("button", { name: "Add Skill" }));
    expect(await screen.findByText("Chess Lessons")).toBeInTheDocument();
  });

  it("shows an error if the form is empty", async () => {
    await renderLoggedIn("/my-skills");
    await userEvent.click(await screen.findByRole("button", { name: "Add Skill" }));
    expect(screen.getByText("Please enter a title and a description.")).toBeInTheDocument();
  });

  it("rejects a price that is not a whole number and does not call the server", async () => {
    await renderLoggedIn("/my-skills");
    await userEvent.type(await screen.findByLabelText("Title"), "Cooking");
    await userEvent.type(screen.getByLabelText("Description"), "Simple meals.");
    await userEvent.clear(screen.getByLabelText(/Price/));
    await userEvent.type(screen.getByLabelText(/Price/), "2.5");
    await userEvent.click(screen.getByRole("button", { name: "Add Skill" }));
    expect(screen.getByText(/whole number/)).toBeInTheDocument();
    expect(backend.calls.some((c) => c.startsWith("POST /api/skills"))).toBe(false);
  });

  it("shows HTML typed into a skill as plain text (XSS safe)", async () => {
    await renderLoggedIn("/my-skills");
    const evil = "<img src=x onerror=alert(1)>";
    await userEvent.type(await screen.findByLabelText("Title"), evil);
    await userEvent.type(screen.getByLabelText("Description"), "<script>alert(1)</script>");
    await userEvent.click(screen.getByRole("button", { name: "Add Skill" }));
    expect(await screen.findByText(evil)).toBeInTheDocument();
    expect(document.querySelector("img[src='x']")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
  });

  it("only shows my own skills under My Skills", async () => {
    await renderLoggedIn("/my-skills");
    await userEvent.type(await screen.findByLabelText("Title"), "Private Owner Skill");
    await userEvent.type(screen.getByLabelText("Description"), "Mine.");
    await userEvent.click(screen.getByRole("button", { name: "Add Skill" }));
    await screen.findByText("Private Owner Skill");
    document.body.innerHTML = "";
    backend.reset();
    await signUpViaApi(); // a different student
    renderApp("/my-skills");
    expect(await screen.findByText("You have not added any skills yet.")).toBeInTheDocument();
  });
});

describe("related books (API)", () => {
  it("shows books on the skill details page", async () => {
    let finish;
    bookService.fetchBooks.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderApp("/skills/1");
    expect(await screen.findByText("Loading books...")).toBeInTheDocument();
    finish([{ key: "/works/1", title: "Eloquent JavaScript", author_name: ["Marijn Haverbeke"], cover_i: 123 }]);
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

  it("retries after a failure and then shows the books", async () => {
    bookService.fetchBooks.mockRejectedValueOnce(new Error("fail"));
    renderApp("/skills/1");
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Eloquent JavaScript")).toBeInTheDocument();
    expect(screen.queryByText(/could not load related books/)).not.toBeInTheDocument();
    expect(bookService.fetchBooks).toHaveBeenCalledTimes(2);
  });

  it("keeps showing the error if the retry fails again", async () => {
    bookService.fetchBooks.mockRejectedValue(new Error("fail"));
    renderApp("/skills/1");
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/could not load related books/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows 'No cover' and 'Unknown author' when book data is missing", async () => {
    bookService.fetchBooks.mockResolvedValue([{ key: "/works/2", title: "Mystery Book" }]);
    renderApp("/skills/1");
    expect(await screen.findByText("Mystery Book")).toBeInTheDocument();
    expect(screen.getByText("No cover")).toBeInTheDocument();
    expect(screen.getByText("Unknown author")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows a cover image when there is one", async () => {
    renderApp("/skills/1");
    expect(await screen.findByAltText("Cover of Eloquent JavaScript")).toHaveAttribute("src", expect.stringContaining("123-M.jpg"));
  });

  it("ignores a slow old response (no stale results)", async () => {
    let finishOld;
    bookService.fetchBooks.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
    renderApp("/skills/1");
    await screen.findByText("Loading books...");
    // Move to a different skill; the first request is still pending.
    await userEvent.click(screen.getByRole("link", { name: /Back to skills/ }));
    await userEvent.click((await screen.findAllByRole("link", { name: "View Details" }))[0]);
    finishOld([{ key: "/old", title: "Old Result", cover_i: 1 }]);
    expect(await screen.findByText("Eloquent JavaScript")).toBeInTheDocument();
    expect(screen.queryByText("Old Result")).not.toBeInTheDocument();
  });

  it("shows the skill not found page for a bad id", async () => {
    renderApp("/skills/99999");
    expect(await screen.findByText("Skill not found")).toBeInTheDocument();
  });
});

describe("skills API failures", () => {
  it("shows an error and a Retry button when skills cannot load", async () => {
    backend.failNext = 2; // the session check uses the first failure, the skills request the second
    renderApp("/skills");
    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("JavaScript Help")).toBeInTheDocument();
  });
});

describe("mobile navigation", () => {
  it("opens and closes the menu with the Menu button", async () => {
    renderApp("/");
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("navigation", { name: "Main" })).not.toHaveClass("open");
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "Main" })).toHaveClass("open");
    await userEvent.click(screen.getByRole("link", { name: "Browse" }));
    expect(screen.getByRole("navigation", { name: "Main" })).not.toHaveClass("open");
  });
});
