import fs from "fs";

import path from "path";
import fetch from "node-fetch";

export const downloadImage = async (url, directory) => {
  const response = await fetch(url);

  const buffer = Buffer.from(await response.arrayBuffer());

  const extension = url.split(".").pop();

  const fileName = `${Date.now()}-${Math.floor(
    Math.random() * 1000
  )}.${extension}`;

  const filePath = `${directory}/${fileName}`;

  await fs.promises.writeFile(filePath, buffer);

  return { filename: fileName, filePath };
};
