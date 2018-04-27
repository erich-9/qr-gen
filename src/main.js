require("jquery-ui/button");
require("jquery-ui/selectmenu");

const $ = require("jquery"),
  Encoder = require("./encoder"),
  FileSaver = require("file-saver"),
  QRCode = require("./qr-code"),
  Renderer = require("./renderer");

const canvas = document.getElementById("qr-code"),
  messageTextarea = document.getElementById("message"),
  errorCorrectionMenu = document.getElementById("error-correction"),
  maskMenu = document.getElementById("mask"),
  versionMenu = document.getElementById("version"),
  saveAsSVGButton = $("#save-as-svg");

$(() => {
  $(messageTextarea)
    .on("keyup paste", delayedUpdate);

  $(errorCorrectionMenu).selectmenu()
    .on("selectmenuchange", delayedUpdate);

  $(maskMenu).selectmenu()
    .on("selectmenuchange", delayedUpdate);

  $(versionMenu).selectmenu().selectmenu("menuWidget").addClass("overflow");
  for (let v = 2, option; v <= 40; ++v) {
    option = document.createElement("option");
    option.innerHTML = 17 + 4 * v;
    versionMenu.appendChild(option);
  }
  $(versionMenu)
    .on("selectmenuchange", delayedUpdate);

  saveAsSVGButton.button()
    .click(saveAsSVG);

  update();
});

let timeout;

function delayedUpdate(delay = 10000) {
  clearTimeout(timeout);
  timeout = setTimeout(update, delay);
}

let msg, v, ec, msk, qrCode;

function update() {
  msg = messageTextarea.value;
  v = versionMenu.selectedIndex + 1;
  ec = errorCorrectionMenu.value;
  msk = maskMenu.selectedIndex;

  while (Encoder.byteLengthOfString(msg) > QRCode.byteCapacity(v, ec) && ++v <= 40);

  try {
    qrCode = new QRCode(msg, v, ec, msk);
    saveAsSVGButton.button("enable");
  }
  catch (Error) {
    qrCode = undefined;
    saveAsSVGButton.button("disable");
  }

  Renderer.drawOnCanvas(qrCode, canvas);
}

function saveAsSVG() {
  if (qrCode === undefined)
    return;

  const name = `${msg.slice(0, 11)}.svg`,
    svg = Renderer.toSVG(qrCode),
    xml = (new XMLSerializer()).serializeToString(svg);

  FileSaver.saveAs(
    new Blob([xml], { type: "image/svg+xml" }), name
  );
}
