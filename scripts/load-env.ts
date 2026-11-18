// Loads .env.local on your machine before anything reads process.env. On Vercel the file isn't there and the
// variables are already set; dotenv never overrides a variable that's already set.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
