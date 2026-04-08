import { updateSlideAsciiSeed } from "../src/ascii/seed-generator.ts";

function readArgument(name) {
  const flagIndex = process.argv.indexOf(`--${name}`);

  if (flagIndex === -1 || flagIndex === process.argv.length - 1) {
    throw new Error(`Missing required argument --${name}`);
  }

  return process.argv[flagIndex + 1];
}

const slidePath = readArgument("slide");
const scenario = readArgument("scenario");
const asciiSeed = await updateSlideAsciiSeed(slidePath, scenario);

if (asciiSeed === null) {
  console.log(`Updated ascii_seed to null in ${slidePath}`);
} else {
  console.log(`Updated ascii_seed in ${slidePath}`);
}
