class Byte {
  static sum(x, y) {
    return (new Byte(x)).add(y);
  }

  static product(x, y) {
    return (new Byte(x)).multiplyWith(y);
  }

  static quotient(x, y) {
    return (new Byte(x)).divideBy(y);
  }

  static power(x, n) {
    return (new Byte(x)).raisedTo(n);
  }

  static powerOf2(n) {
    return new Byte(exp(n));
  }

  constructor(v) {
    if (v instanceof Byte)
      v = v.v;

    this.v = mask(v);
  }

  isZero() {
    return this.v === 0;
  }

  add(other) {
    this.v = this.v ^ other.v;

    return this;
  }

  multiplyWith(other) {
    if (this.isZero() || other.isZero())
      this.v = 0;
    else
      this.v = exp(log(this.v) + log(other.v));

    return this;
  }

  divideBy(other) {
    this.v = exp(log(this.v) - log(other.v));

    return this;
  }

  raisedTo(n) {
    this.v = exp(n * log(this.v));

    return this;
  }

  inverse() {
    return Byte.quotient(1, this);
  }

  toBits() {
    const res = [];

    for (let i = 0, v = this.v; i < 8; ++i, v >>= 1)
      res.unshift(v % 2);

    return res;
  }

  toString(binary = true) {
    return binary
      ? this.v.toString(2).padStart(8, "0")
      : (this.isZero() ? "0" : `[${log(this.v)}]`);
  }
}

function exp(n) {
  return _exp[mod255(n)];
}

function log(x) {
  return _log[x];
}

function mask(v) {
  return v & 255;
}

function mod255(x) {
  return ((x % 255) + 255) % 255;
}

const _exp = new Array(255), _log = new Array(256);

for (let x = 1, i = 0; i < 255; ++i) {
  _exp[i] = x;
  _log[x] = i;

  x <<= 1;
  if (x & (1 << 8))
    x ^= 0b100011101;
}

module.exports = Byte;
