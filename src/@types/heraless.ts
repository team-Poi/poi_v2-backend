import { NextFunction, Request, Response } from "express";

export interface ParsedQs {
  [key: string]: undefined | string | string[] | ParsedQs | ParsedQs[];
}
export type Req = Request<
  {
    link: string;
  },
  any,
  any,
  ParsedQs,
  Record<string, any>
>;
export type Res = Response;

export type Next = NextFunction;
