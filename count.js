const dirPath = path.join(process.cwd(), "images");
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath);
}
let index = 1;
const fileName = `image${index}.jpg`;

index++;

const imagePath = path.join(dirPath, fileName);

const file = fs.createWriteStream(imagePath);

const promise = new Promise((resolve, reject) => {
  https

    .get(imageSizeFixer(source), (res) => {
      res.pipe(file);

      file.on("finish", () => {
        file.close();

        // console.log(`Image saved to ${imagePath}`);
        localImagesList.push(imagePath);
        resolve();
      });
    })

    .on("error", (err) => {
      fs.unlink(
        imagePath,

        (err) => err && console.error("erorr image error image 7awelll")
      );

      console.error(`Error downloading image: ${err.message}`);

      reject(err);
    });
});

localPromises.push(promise);

try {
  await Promise.all(localPromises);
} catch (err) {
  console.error(`Error downloading images: ${err.message}`);
}
