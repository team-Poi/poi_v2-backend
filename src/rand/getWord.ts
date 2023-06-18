import getElectronic from "./getElectronic";
import getFood from "./getFood";

let getFuncs = [getFood, getElectronic];

function rand(start: number, end: number) {
  return Math.floor(Math.random() * (end - start + 1) + start);
}

export default function getWord() {
  let func = getFuncs[rand(0, getFuncs.length - 1)];
  return func();
}
