const { getAppBranding } = require('./src/lib/branding');
try {
  console.log("Testing branding for /docufit...");
  const b = getAppBranding('/docufit');
  console.log("Result:", b);
  console.log("Testing branding for /docudent...");
  const b2 = getAppBranding('/docudent');
  console.log("Result:", b2);
  console.log("Success!");
} catch (e) {
  console.error("FAILED:", e);
}
