import type { Metadata } from "next";
import StockPilotApp from "./StockPilotApp";

export const metadata: Metadata = {
  title: "StockPilot — Research with a process",
  description: "A beginner-friendly workspace for structured stock research, paper trading, and reflection.",
};

export default function Home() {
  return <StockPilotApp />;
}
