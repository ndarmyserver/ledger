// fetchVendors.js
import fs from "fs";

const SCRIPT_URL = process.env.SCRIPT_URL; // store your Google script URL as a GitHub secret
const SCRIPT_UID = process.env.SCRIPT_UID;

async function main() {
  if (!SCRIPT_URL) {
    throw new Error("SCRIPT_URL not set in secrets!");
  }

  if (!SCRIPT_UID) {
    throw new Error("SCRIPT_UID not set in secrets!");
  }

  const res = await fetch(`${SCRIPT_URL}?uid=${encodeURIComponent(SCRIPT_UID)}`);
  const data = await res.json();

  if (!data.success || !data.vendors) {
    throw new Error("Invalid response from Google Script");
  }

  // write to JSON
  fs.writeFileSync("vendors.json", JSON.stringify(data.vendors, null, 2), "utf-8");
  console.log("vendors.json updated with", data.vendors.length, "vendors");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});