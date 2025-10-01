import { NewsletterParser } from "@/types/newsletter-types";
import { DailyTheRundownAiParser } from "./daily-therundown-ai";

// Parser registry - add new parsers here
const parsers: NewsletterParser[] = [
  new DailyTheRundownAiParser(),
  // Add more parsers here as we build them
  // new MorningBrewParser(),
  // new TechCrunchParser(),
];

export class ParserFactory {
  static getParser(fromAddress: string): NewsletterParser | null {
    return parsers.find((parser) => parser.canParse(fromAddress)) || null;
  }

  static getAllParsers(): NewsletterParser[] {
    return parsers;
  }

  static getParserByName(name: string): NewsletterParser | null {
    return parsers.find((parser) => parser.name === name) || null;
  }
}
