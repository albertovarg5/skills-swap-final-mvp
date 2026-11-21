// Shared by the React forms (fast feedback) and the Express server (the real check).
import { categories } from "./data/sampleSkills.js";

export function validateRegistration({ name, email, password }) {
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50) return "Name must be 2 to 50 characters.";
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  if (typeof password !== "string" || password.length < 8 || password.length > 72) return "Password must be 8 to 72 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must contain a letter and a number.";
  return null;
}

export function validateLogin({ email, password }) {
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) return "Please enter your email and password.";
  return null;
}

export function validateSkill({ title, category, price, description }) {
  if (typeof title !== "string" || !title.trim() || typeof description !== "string" || !description.trim()) return "Please enter a title and a description.";
  if (title.trim().length > 80) return "Title must be 80 characters or less.";
  if (description.trim().length > 500) return "Description must be 500 characters or less.";
  if (!categories.includes(category)) return "Please choose a valid category.";
  if (!Number.isInteger(price) || price < 0 || price > 1000) return "Price must be a whole number from 0 to 1000.";
  return null;
}
