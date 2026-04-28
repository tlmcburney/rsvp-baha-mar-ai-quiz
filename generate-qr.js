const QRCode = require("qrcode");
const path = require("path");

const url = process.argv[2];

if (!url) {
  console.error("Usage: node generate-qr.js <URL>");
  console.error("Example: node generate-qr.js https://your-site.netlify.app");
  process.exit(1);
}

const outputPath = path.join(__dirname, "qr-code.png");

QRCode.toFile(
  outputPath,
  url,
  {
    type: "png",
    width: 1024,
    margin: 2,
    color: {
      dark: "#0a1628",
      light: "#ffffff",
    },
  },
  function (err) {
    if (err) {
      console.error("Failed to generate QR code:", err);
      process.exit(1);
    }
    console.log("QR code saved to", outputPath);
    console.log("URL:", url);
  }
);
