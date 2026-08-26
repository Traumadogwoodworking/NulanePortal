import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "public", "resources", "definian");
const defaultPromoUrl =
  "https://vercel-portal-exact-traumadogwoodworkings-projects.vercel.app/promo/definian-launch/";
const promoUrl = (process.env.DEFINIAN_PROMO_URL || defaultPromoUrl).trim();
const parsedUrl = new URL(promoUrl);

if (parsedUrl.protocol !== "https:" || !/^\/promo\/[a-z0-9][a-z0-9-]*\/?$/i.test(parsedUrl.pathname)) {
  throw new Error("DEFINIAN_PROMO_URL must be an HTTPS Definian /promo/<campaign>/ URL.");
}

await fs.mkdir(outputDir, { recursive: true });

const pngPath = path.join(outputDir, "definian-promo-qr.png");
const svgPath = path.join(outputDir, "definian-promo-qr.svg");
const manifestPath = path.join(outputDir, "definian-promo-qr.json");
const options = {
  width: 900,
  margin: 4,
  errorCorrectionLevel: "M",
  color: { dark: "#0D2C71", light: "#FFFFFF" },
};

await Promise.all([
  QRCode.toFile(pngPath, parsedUrl.toString(), options),
  QRCode.toFile(svgPath, parsedUrl.toString(), { ...options, type: "svg" }),
]);
await fs.writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      campaign: parsedUrl.pathname.split("/").filter(Boolean).at(-1),
      target: parsedUrl.toString(),
      behavior: "Tracks authenticated scan and download events without redeeming or gating access.",
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(JSON.stringify({ pngPath, svgPath, manifestPath, promoUrl: parsedUrl.toString() }, null, 2));
