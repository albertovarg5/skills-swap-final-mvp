import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import jwt from "jsonwebtoken";
import { vi } from "vitest";
import * as bookService from "../services/bookService";
import { startTestApi, signUpViaApi, renderApp, uniqueEmail } from "./helpers";

let backend;
beforeAll(async () => { backend = await startTestApi(); });
afterAll(() => backend.stop());
beforeEach(() => {
  backend.reset();
  vi.spyOn(bookService, "fetchBooks").mockResolvedValue([]);
});

async function fillRegister({ name = "Ana Lopez", email = uniqueEmail(), password = "password123" } = {}) {
  await userEvent.type(screen.getByLabelText("Name"), name);
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Register" }));
}

describe("registration", () => {
  it("creates an account, logs the user in, and shows a success message", async () => {
    renderApp("/register");
    await fillRegister();
    expect(await screen.findByText("Account created. Welcome, Ana Lopez!")).toBeInTheDocument();
    expect(screen.getByText("Hi, Ana Lopez")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Browse Skills" })).toBeInTheDocument();
  });

  it.each([
    [{ name: "A" }, /Name must be/],
    [{ email: "nope" }, /valid email/],
    [{ password: "short1" }, /8 to 72/],
    [{ password: "lettersonly" }, /letter and a number/],
  ])("shows a validation error for %j and does not call the server", async (bad, message) => {
    renderApp("/register");
    await fillRegister(bad);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(backend.calls.some((c) => c.includes("/auth/register"))).toBe(false);
  });

  it("shows the server error when the email is already used", async () => {
    const { email } = await signUpViaApi();
    backend.reset(); // new browser, no cookie
    renderApp("/register");
    await fillRegister({ email });
    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
  });
});

describe("login and logout", () => {
  it("logs in with the right password", async () => {
    const { email } = await signUpViaApi("Ben Kim");
    backend.reset();
    renderApp("/login");
    await userEvent.type(screen.getByLabelText("Email"), email);
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Welcome back, Ben Kim!")).toBeInTheDocument();
  });

  it("shows an error for incorrect credentials and stays logged out", async () => {
    const { email } = await signUpViaApi();
    backend.reset();
    renderApp("/login");
    await userEvent.type(screen.getByLabelText("Email"), email);
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass1");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Incorrect email or password.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
  });

  it("asks for both fields when the login form is empty", async () => {
    renderApp("/login");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(screen.getByText("Please enter your email and password.")).toBeInTheDocument();
    expect(backend.calls.some((c) => c.includes("/auth/login"))).toBe(false);
  });

  it("shows a friendly error when the network is down", async () => {
    renderApp("/login");
    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    backend.failNext = 1;
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
  });

  it("logs out, clears the session cookie, and locks private pages again", async () => {
    await signUpViaApi();
    renderApp("/saved");
    await userEvent.click(await screen.findByRole("button", { name: "Log out" }));
    expect(await screen.findByText("You have been logged out.")).toBeInTheDocument();
    expect(backend.jar.token).toBeUndefined();
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
  });

  it("redirects a logged-in user away from the login page", async () => {
    await signUpViaApi();
    renderApp("/login");
    expect(await screen.findByRole("heading", { name: "Browse Skills" })).toBeInTheDocument();
  });
});

describe("protected routes", () => {
  it.each(["/saved", "/my-skills"])("redirects a visitor from %s to the login page", async (path) => {
    renderApp(path);
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByText("Please log in to see this page.")).toBeInTheDocument();
  });

  it("goes back to the page the user wanted after logging in", async () => {
    const { email } = await signUpViaApi();
    backend.reset();
    renderApp("/my-skills");
    await userEvent.type(await screen.findByLabelText("Email"), email);
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("heading", { name: "My Skills" })).toBeInTheDocument();
  });

  it("keeps public pages open without an account", async () => {
    renderApp("/skills");
    expect(await screen.findByText("JavaScript Help")).toBeInTheDocument();
    expect(screen.queryByText("Hi,", { exact: false })).not.toBeInTheDocument();
  });
});

describe("session persistence and expiration", () => {
  it("restores the session after a refresh using the cookie", async () => {
    await signUpViaApi("Cara Diaz");
    renderApp("/my-skills");
    expect(await screen.findByText("Hi, Cara Diaz")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Skills" })).toBeInTheDocument();
  });

  it("treats an expired token as logged out on page load", async () => {
    await signUpViaApi();
    backend.jar.token = jwt.sign({ sub: "1", csrf: "x" }, process.env.JWT_SECRET, { expiresIn: -60 });
    renderApp("/my-skills");
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
  });

  it("logs the user out with a message when the token expires during use", async () => {
    await signUpViaApi();
    renderApp("/skills");
    const saveButton = (await screen.findAllByRole("button", { name: "Save" }))[0];
    await screen.findByText(/Hi, /);
    backend.jar.token = jwt.sign({ sub: "1", csrf: "x" }, process.env.JWT_SECRET, { expiresIn: -60 });
    await userEvent.click(saveButton);
    expect(await screen.findByText("Your session expired. Please log in again.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
  });

  it("never stores the token or password in localStorage", async () => {
    renderApp("/register");
    await fillRegister({ password: "password123" });
    await screen.findByText(/Account created/);
    const stored = JSON.stringify({ ...localStorage });
    expect(stored).not.toMatch(/password123|token|eyJ/);
  });
});
