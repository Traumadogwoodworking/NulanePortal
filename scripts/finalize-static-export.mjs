import { access, copyFile } from "fs/promises";
import { constants } from "fs";
import path from "path";

const source = path.resolve("public", "404.html");
const destination = path.resolve("out", "404.html");

await access(source, constants.R_OK);
await access(path.dirname(destination), constants.W_OK);
await copyFile(source, destination);

console.log(JSON.stringify({ facilityRedirect404: destination }));
