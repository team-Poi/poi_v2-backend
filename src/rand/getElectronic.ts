import electronics from "./electronic";
import elecbefore from "./electronicBefore";
export default function getElectronic() {
  let f = electronics[Math.floor(Math.random() * electronics.length)];
  let l = elecbefore[Math.floor(Math.random() * elecbefore.length)];
  let c = Math.floor(Math.random() * 99) + 1;
  return `${c}개의${l}${f}`;
}
