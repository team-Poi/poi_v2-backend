import foods from "./foods";
import fbefore from "./foodBefore";

export default function getFood() {
  let f = foods[Math.floor(Math.random() * foods.length)];
  let l = fbefore[Math.floor(Math.random() * fbefore.length)];
  let c = Math.floor(Math.random() * 999) + 1;
  return `${c}개의${l}${f}`;
}
