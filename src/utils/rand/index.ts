export const randWordEng = (len: number) => {
  let usables =
    "qwertyuopasdfghjkzxcvbnm23456789QWERTYUOPASDFGHJKLZXCVBNM".split("");
  let out = "";
  while (out.length < len)
    out += usables[Math.floor(Math.random() * usables.length)];
  return out;
};
