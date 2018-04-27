require("./array-extensions");

const Encoder = require("./encoder"),
  Specs = require("./qr-specifications"),
  map = Array.prototype.map;

class QRCode {
  static byteCapacity(version, errorCorrectionLevel) {
    return Specs.capacityAndGroups[errorCorrectionLevel][version - 1].db -
      (version < 10 ? 2 : 3);
  }

  constructor(message, version, errorCorrectionLevel, maskPattern = 0) {
    if (
      (version < 1 || version > 40) ||
      ["L", "M", "Q", "H"].every(ec => ec !== errorCorrectionLevel) ||
      (maskPattern < 0 || maskPattern > 7)
    )
      throw Error;

    this.version = version;
    this.errorCorrectionLevel = errorCorrectionLevel;
    this.maskPattern = maskPattern;

    this.n = 17 + 4 * version;
    this.M = Array.init(() => Array.init(this.n), this.n);

    this.formatData = prepareFormatData(errorCorrectionLevel, maskPattern);
    this.versionData = prepareVersionData(version);
    this.messageData = prepareMessageData(message, version, errorCorrectionLevel);

    this.addFixedBits();
    this.addFormatBits();
    this.addMessageBits();
    this.addMaskBits();
  }

  addFixedBits() {
    const n = this.n, M = this.M, v = this.version, VD = this.versionData;

    // corners
    [
      [i => i, j => j],
      [i => (n - 1) - i, j => j],
      [i => i, j => (n - 1) - j]
    ]
      .forEach(o =>
        Specs.cornerPattern.forEach((r, i) =>
          r.forEach((b, j) => {
            M[o[0](i)][o[1](j)] = reserve(b);
          })
        )
      );

    // alignment
    Specs.alignmentPatternPositions[v - 1].forEach(x =>
      Specs.alignmentPatternPositions[v - 1].forEach(y => {
        if (
          [[-2, -2], [-2, 2], [2, -2], [2, 2]].some(
            o => isReserved(M[x + o[0]][y + o[1]])
          )
        )
          return;

        Specs.alignmentPattern.forEach((r, i) =>
          r.forEach((b, j) => {
            M[(x - 2) + i][(y - 2) + j] = reserve(b);
          })
        );
      })
    );

    // timing
    for (let i = 8; i < n - 8; ++i)
      M[i][6] = M[6][i] = reserve(i % 2 ? 0 : 1);

    // dark
    M[n - 8][8] = reserve(1);

    // version
    if (VD.length > 0) {
      for (let i = 0; i < 3; ++i) {
        for (let j = 0; j < 6; ++j)
          M[n - 9 - i][5 - j] = M[5 - j][n - 9 - i] = reserve(VD[i % 3 + j * 3]);
      }
    }

    return this;
  }

  addFormatBits() {
    const n = this.n, M = this.M, FD = i => reserve(this.formatData[i]);

    for (let i = 0; i < 6; ++i)
      M[8][i] = M[(n - 1) - i][8] = FD(i);
    M[8][7] = M[n - 7][8] = FD(6);
    M[8][8] = M[8][n - 8] = FD(7);
    M[7][8] = M[8][n - 7] = FD(8);
    for (let i = 9; i < 15; ++i)
      M[14 - i][8] = M[8][n - 15 + i] = FD(i);
  }

  addMaskBits() {
    const n = this.n, M = this.M, MP = Specs.maskPatterns[this.maskPattern];

    for (let i = 0; i < n; ++i) {
      for (let j = 0; j < n; ++j) {
        if (!isReserved(M[i][j]))
          M[i][j] ^= MP(i, j) ? 1 : 0;
      }
    }
  }

  addMessageBits() {
    const n = this.n, M = this.M, MD = this.messageData;

    for (let c = n - 2, i = 0, up = true; c >= 0; c -= 2, up = !up) {
      for (let y = up ? n - 1 : 0; up ? y >= 0 : y < n; up ? --y : ++y) {
        for (let p = 1; p >= 0; --p) {
          if (!isReserved(M[y][c + p]))
            M[y][c + p] ^= MD[i++];
        }
      }
      if (c === 7)
        --c;
    }
  }

  toString() {
    const n = this.n;

    let res = `     ${"_".repeat(2 * n)}\n`, x;

    for (let i = 0; i < n; ++i) {
      res += `${i.toString().padStart(3)} |`;
      for (let j = 0; j < n; ++j) {
        x = this.M[i][j] % 2;
        res += ` ${x === 0 ? "0" : (x === 1 ? "1" : " ")}`;
      }
      res += "\n";
    }

    return res;
  }
}

function reserve(v) {
  return (1 << 8) | v;
}

function isReserved(v) {
  return v & (1 << 8);
}

function prepareFormatData(ecl, mp) {
  const ecBitStr = Specs.errorCorrectionLevelToBitStr[ecl],
    mpBitStr = mp.toString(2).padStart(3, "0"),
    bitStr = ecBitStr + mpBitStr,
    bytes = map.call(bitStr, i => parseInt(i)),
    ecBytes = Encoder.errorCorrectionBytes(bytes, Specs.formatGeneratorPolynomial);

  return bytes.concat(ecBytes.map(v => v.v)).map((v, i) => v ^ Specs.formatMask[i]);
}

function prepareVersionData(v) {
  if (v < 7)
    return [];

  const bitStr = v.toString(2).padStart(6, "0"),
    bytes = map.call(bitStr, i => parseInt(i)),
    ecBytes = Encoder.errorCorrectionBytes(bytes, Specs.versionGeneratorPolynomial);

  return bytes.concat(ecBytes.map(v => v.v));
}

function prepareMessageData(msg, v, ecl) {
  const { db, ec, groups } = Specs.capacityAndGroups[ecl][v - 1],
    bitStr = Encoder.stringToBitStr(msg, v > 9),
    bytes = Encoder.bitStrToBytes(bitStr, db),
    generatorPolynomial = Specs.messageGeneratorPolynomial(ec),
    byteGroups = Encoder.breakBytesUpIntoGroups(bytes, groups);

  byteGroups.forEach(g => {
    for (let i = 0, l = g.length; i < l; ++i) {
      g[i] = {
        "db": g[i],
        "ec": Encoder.errorCorrectionBytes(g[i], generatorPolynomial)
      };
    }
  });

  const res = [];

  ["db", "ec"].forEach(w => {
    for (let i = 0, allUndefined = false; !allUndefined; ++i) {
      allUndefined = true;

      byteGroups.forEach(g => g.forEach(b => {
        if (b[w][i] !== undefined) {
          res.push(b[w][i].toBits());
          allUndefined = false;
        }
      }));
    }
  });

  return res.merge();
}

module.exports = QRCode;
