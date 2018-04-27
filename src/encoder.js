require("./array-extensions");

const Byte = require("./byte"),
  BytePolynomial = require("./byte-polynomial"),
  reduce = Array.prototype.reduce;

function padBitStrToMultipleOfByteLength(bitStr) {
  return "0".repeat((8 - bitStr.length % 8) % 8) + bitStr;
}

function charToBitStr(char) {
  return char.charCodeAt(0).toString(2);
}

function stringToBitStr(str, useTwoBytesForLength = false) {
  const modeInfo = "0100",
    bitStr = reduce.call(str,
      (a, c) => a + padBitStrToMultipleOfByteLength(charToBitStr(c)), ""
    ),
    lengthInfo = (bitStr.length >> 3).toString(2)
      .padStart(useTwoBytesForLength ? 16 : 8, "0");

  return [modeInfo, lengthInfo, bitStr].join("");
}

function bc(x) {
  return x < 256 ? 1 : (bc(x >> 8) + 1);
}

function byteLengthOfString(str) {
  return reduce.call(str, (a, c) => a + bc(c.charCodeAt(0)), 0);
}

function bitStrToBytes(bitStr, minLength = 0) {
  const res = [], l = bitStr.length;

  let i = 0;

  for (; i < l; i += 8)
    res.push(new Byte(parseInt(bitStr.slice(i, i + 8).padEnd(8, "0"), 2)));

  for (let j = i / 8, even = true; j < minLength; ++j, even = !even)
    res.push(new Byte(even ? 0b11101100 : 0b00010001));

  return res;
}

function bytesToPolynomial(bytes, degree = 0) {
  const l = bytes.length, n = degree < l ? 0 : degree + 1 - l;

  return new BytePolynomial(
    Array.init(() => 0, n).concat(bytes.slice().reverse())
  );
}

function polynomialToBytes(poly, length = 0) {
  const l = poly.coeffs.length, n = length <= l ? 0 : length - l;

  return Array.init(() => new Byte(0), n).concat(poly.coeffs.slice().reverse());
}

function errorCorrectionBytes(bytes, generatorPolynomial) {
  const l = bytes.length, k = generatorPolynomial.coeffs.length - 1,
    m = bytesToPolynomial(bytes, l + k - 1),
    r = BytePolynomial.remainder(m, generatorPolynomial);

  return polynomialToBytes(r, k);
}

function breakBytesUpIntoGroups(bytes, gs = [[1, Infinity]]) {
  const res = [], l = bytes.length;

  let i = 0;

  gs.forEach(g => {
    const group = [];

    for (let j = 0; j < g[0]; ++j) {
      const block = [];

      for (let k = 0; k < g[1] && i < l; ++k, ++i)
        block.push(bytes[i]);

      group.push(block);
    }

    res.push(group);
  });

  return res;
}

module.exports = {
  bitStrToBytes,
  bytesToPolynomial,
  byteLengthOfString,
  breakBytesUpIntoGroups,
  errorCorrectionBytes,
  stringToBitStr
};
