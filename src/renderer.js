function drawOnCanvas(qrCode, canvas) {
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (qrCode === undefined)
    return;

  const w = Math.min(canvas.width, canvas.height),
    n = qrCode.n, s = w / n, ds = s / 30;

  for (let x = 0; x < n; ++x) {
    for (let y = 0; y < n; ++y) {
      const b = qrCode.M[x][y];

      if (b === undefined || b % 2 === 0)
        continue;

      context.beginPath();
      context.rect(s * y - ds, s * x - ds, s + ds, s + ds);
      context.fill();
    }
  }
}

function toSVG(qrCode) {
  const svgNS = "http://www.w3.org/2000/svg",
    svg = document.createElementNS(svgNS, "svg"),
    gMain = document.createElementNS(svgNS, "g"), gBW = {},
    w = 336, n = qrCode.n, s = w / n;

  ["width", "height"].forEach(d => svg.setAttribute(d, w + 8 * s));
  gMain.setAttribute("transform", `translate(${4 * s} ${4 * s})`);

  ["white", "black"].forEach(c => {
    const g = gBW[c] = document.createElementNS(svgNS, "g");

    g.setAttribute("fill", c);
    g.setAttribute("stroke-width", s / 14);
    g.setAttribute("stroke", c);

    gMain.appendChild(g);
  });

  for (let x = 0; x < n; ++x) {
    for (let y = 0; y < n; ++y) {
      const b = qrCode.M[x][y];

      if (b === undefined)
        continue;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

      rect.setAttribute("x", s * y);
      rect.setAttribute("y", s * x);

      ["width", "height"].forEach(d =>
        rect.setAttribute(d, `${s}px`)
      );

      gBW[b % 2 === 0 ? "white" : "black"].appendChild(rect);
    }
  }

  gMain.appendChild(gBW.white);
  gMain.appendChild(gBW.black);
  svg.appendChild(gMain);

  return svg;
}

module.exports = {
  drawOnCanvas,
  toSVG
};
