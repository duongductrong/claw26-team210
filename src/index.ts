import dotenv from "dotenv";
import { initSkills } from "./skills";
import { CommandLineInterface } from "./cli/terminal";

// Load configurations from .env
dotenv.config();

// Initialize skills registry
initSkills();

// Bootstrap and run CLI
const cli = new CommandLineInterface();
cli.start();
