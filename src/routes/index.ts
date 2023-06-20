import { Req, Res } from "@/@types/heraless";

export function GET(req: Req, res: Res) {
  res.send("This server is powered by Heraless by @github/Oein");
}
