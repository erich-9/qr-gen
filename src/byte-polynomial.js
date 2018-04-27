require("./array-extensions");

const Byte = require("./byte");

class BytePolynomial {
  static sum(x, y) {
    return (new BytePolynomial(x)).add(y);
  }

  static product(x, y) {
    const xc = x.coeffs, yc = y.coeffs,
      xcl = xc.length, ycl = yc.length, cl = xcl + ycl - 1;

    const r = Array.init(() => new Byte(0), cl);

    for (let xi = 0; xi < xcl; ++xi) {
      for (let yi = 0; yi < ycl; ++yi)
        r[xi + yi].add(Byte.product(xc[xi], yc[yi]));
    }

    return new BytePolynomial(r);
  }

  static remainder(x, y) {
    const xc = x.coeffs, yc = y.coeffs,
      xcl = xc.length, ycl = yc.length, d = xcl - ycl;

    if (d < 0)
      return new BytePolynomial(xc);

    const r = Array.init(i => new Byte(xc[i]), xcl - 1),
      c = xc[xcl - 1];

    for (let yi = 0; yi < ycl - 1; ++yi)
      r[yi + d].add(Byte.product(c, yc[yi]));

    return BytePolynomial.remainder(new BytePolynomial(r), y);
  }

  constructor(v, clone = true) {
    if (v instanceof BytePolynomial)
      v = v.coeffs;

    this.coeffs = !clone ? v : Array.init(i => new Byte(v[i]), v.length);
    prune.call(this);
  }

  add(other) {
    const tc = this.coeffs, oc = other.coeffs,
      tcl = tc.length, ocl = oc.length, cl = Math.min(tcl, ocl);

    for (let i = 0; i < cl; ++i)
      tc[i].add(oc[i]);
    for (let i = tcl; i < ocl; ++i)
      tc.push(new Byte(oc[i]));
    prune.call(this);

    return this;
  }

  multiplyWith(other) {
    this.coeffs = BytePolynomial.product(this, other).coeffs;

    return this;
  }

  modulo(other) {
    this.coeffs = BytePolynomial.remainder(this, other).coeffs;

    return this;
  }

  toString(binary = true) {
    const smds = [];

    for (let c = this.coeffs, i = c.length; --i >= 0;) {
      if (!c[i].isZero())
        smds.push(`${c[i].toString(binary)} X^${i}`);
    }

    return smds.length === 0 ? "0" : smds.join(" + ");
  }
}

function prune() {
  for (let c = this.coeffs, i = c.length; --i >= 0 && c[i].isZero();)
    c.pop();
}

module.exports = BytePolynomial;
