const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const https = require("https");
const dirPath = path.join(process.cwd(), "images");
const puppeteer = require("puppeteer");
let allProductInfo = [];
const waitForSelectorOptions = { timeout: 900000 };
function imageSizeFixer(imageUrl) {
  let newImageUrl = imageUrl.replace("sw=80&sh=80", "sw=800&sh=800");

  newImageUrl = newImageUrl.replace("80w", "");
  newImageUrl = newImageUrl.replace(/\s+/g, "");

  return newImageUrl;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let localProductInfo = {};
async function extractEAN(excelFilePath) {
  try {
    const workbook = xlsx.readFile(excelFilePath);

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const csvData = xlsx.utils
      .sheet_to_csv(worksheet, { header: 1 })
      .trim()
      .split("\n"); // Find the column index of "EAN Article"

    const headerRow = csvData[0].split(",");

    const eanColumnIndex = headerRow.findIndex(
      (header) => header === "EAN Article"
    ); // Add "status" column to header row

    headerRow.push("status"); // Extract values from "EAN Article" column

    const rows = csvData.slice(1);

    const updatedRows = [];

    const browser = await puppeteer.launch({
      headless: false,

      timeout: 120000,
    });

    const page = await browser.newPage();

    await page.goto("https://www.go-sport.com/", { timeout: 0 });
    const writeStream = fs.createWriteStream("ThirdOone.csv");

    writeStream.write(
      `product ref;product name;Brand name;size;color;images;resume_long;resume_court;Description;price \n`
    );
    const cookieButtonSelector = "#onetrust-accept-btn-handler";

    await page.waitForSelector(cookieButtonSelector, waitForSelectorOptions);

    const cookieButton = await page.$(cookieButtonSelector);

    if (cookieButton) {
      await cookieButton.click();

      await sleep(3000);
    } else {
      console.log("Cookie button not found");
    }

    const searchBarSelector =
      ".c-input.form-control.c-search-field.js-c-search-field";

    const searchResultsSelector =
      ".c-suggestions__link.c-link.c-link--no-underline.c-link--arrow-icon";

    for (const row of rows) {
      const rowValues = row.split(",");

      const code = rowValues[eanColumnIndex];

      await page.waitForSelector(searchBarSelector, waitForSelectorOptions);

      await page.$eval(searchBarSelector, (element) => (element.value = ""));

      await page.type(searchBarSelector, code);

      await sleep(5000);

      const searchResults = await page.$(searchResultsSelector);

      if (searchResults) {
        searchResults.click();
        await sleep(2000);
        const url = page.url();
        if (url.includes("intersport")) {
          await page.goto("https://www.go-sport.com/", {
            waitUntil: "networkidle0",
          });
          continue;
        }
        // Get product brand name
        const brandNameSelector = ".c-product-detail__brand";

        await page.waitForSelector(brandNameSelector);
        const brandNameElement = await page.$(brandNameSelector);
        const brandName = await brandNameElement.evaluate((el) =>
          el.textContent.trim()
        );
        console.log({ brandName });
        localProductInfo["Brand name"] = brandName;

        // Get product name
        const productNameSelector = ".c-product-detail__name";
        await page.waitForSelector(productNameSelector);
        const productNameElement = await page.$(productNameSelector);
        const productName = await productNameElement.evaluate((el) =>
          el.textContent.trim()
        );
        console.log({ productName });
        localProductInfo["Product name"] = productName;

        // Get product description
        const productDescriptionSelector =
          ".c-product-detail__content .content";

        /* await page.waitForSelector(productDescriptionSelector, {
  timeout: 0,
});*/

        let productDescription = await page.$eval(
          productDescriptionSelector,
          (el) => el.textContent.replace(/\r?\n|\r/g, "")
        );

        if (!productDescription) {
          productDescription = "There is no description";
        }

        localProductInfo["Description"] = productDescription;
        //console.log(productDescription);

        // Get product price
        const productPriceSelector = ".c-prices__sales";
        await page.waitForSelector(productPriceSelector);
        const productPriceElement = await page.$(productPriceSelector);
        const productPrice = await productPriceElement.evaluate((el) =>
          el.textContent.replace(/^\s*$(?:\r\n?|\n)/gm, "").slice(0, -3)
        );
        console.log({ productPrice });
        localProductInfo["price"] = productPrice;

        // Get product sizes
        //const productSizeSelector = "[data-attr-id='size_vendeur'] > span";

        // const productSizeElements = await page.$$(productSizeSelector);
        const productSizeElements = await page.evaluate(() => {
          const productSizeSelector =
            "#maincontent > div > div:nth-child(2) > div.col-12.col-xmd-6.c-product-detail__infos > div.c-product-detail__main-section.row.mx-xmd-0 > div.attributes.c-product-detail__attributes.col-12.p-0.pr-md-3 > div:nth-child(2) > div > div > div > div.c-variation__attr-wrapper > a";
          const bla = document.querySelectorAll(productSizeSelector);
          const wa = Array.from(bla).map((ele) => ele.innerText);
          return wa;
        });
        // const productSizeElements = await page.$eval("", (elements) =>
        //   Array.from(elements).map((ele) => ele.innerText)
        // );
        console.log("productSizeElements +++++++++++", productSizeElements);
        const productSizes = [];
        // for (const element of productSizeElements) {
        //   try {
        //     // const productSize = await element.evaluate((el) =>
        //     //   el.textContent.trim()
        //     // );
        //     // productSizes.push(productSize);
        //   } catch (error) {
        //     console.error("Error occurred while getting product size:", error);
        //   }
        // }
        // console.log(productSizes);
        // Get resume

        const allInfoClass = ".c-attribute";
        const allInfoElements = await page.$$(allInfoClass);
        for (const elem of allInfoElements) {
          let info = await elem.evaluate((el) => el.textContent.trim());
          info = info.replace("\n", "");

          let infoKey = await elem.$eval(".c-attribute__label", (el) =>
            el.textContent.trim()
          );
          infoKey = infoKey.replace(/\r?\n|\r/g, "");
          infoKey = infoKey.substring(0, infoKey.indexOf(" "));

          let infoValue = await elem.$eval(".c-attribute__value", (el) =>
            el.textContent.trim()
          );
          infoValue = infoValue.replace(/\r?\n|\r/g, "");

          if (infoKey === "EAN") {
            localProductInfo["Product Ref"] = infoValue;
          }

          // console.log(infoValue);
        }
        //mainCategory
        let color = await page.$$eval(
          "#maincontent > div > div:nth-child(2) > div.col-12.col-xmd-6.c-product-detail__infos > div.c-product-detail__main-section.row.mx-xmd-0 > div.attributes.c-product-detail__attributes.col-12.p-0.pr-md-3 > div:nth-child(2) > div:nth-child(2) > div > div > div.c-variation__color-wrapper > button.c-variation__color-tile.couleur_marketing-value.selected.selectable > span",
          (eles) => Array.from(eles).map((ele) => ele.innerText)
        );
        // const colors = await page.evaluate(() => {
        //   const colorselector =
        //     "#maincontent > div > div:nth-child(2) > div.col-12.col-xmd-6.c-product-detail__infos > div.c-product-detail__main-section.row.mx-xmd-0 > div.attributes.c-product-detail__attributes.col-12.p-0.pr-md-3 > div:nth-child(2) > div:nth-child(2) > div > div > div.c-variation__color-wrapper > button.c-variation__color-tile.couleur_marketing-value.selected.selectable > span";
        //   const NodeListOfColors = document.querySelectorAll(colorselector);
        //   const AllColors = Array.from(NodeListOfColors).map(
        //     (ele) => ele.innerText
        //   );
        //   return AllColors;
        // });

        if (color.length === 0) {
          color = await page.$$eval(
            " #c-product-detail__attributes > div > div > div > div:nth-child(1) > div.js-expandable-attribute",
            (elements) => Array.from(elements).map((ele) => ele.innerText)
          );
          color = color.join(" ");
        }
        localProductInfo["color"] = color;

        //resume
        const additionalInfoSelector2 = ".col-xmd-6";
        const additionalInfoElements2 = await page.$$(additionalInfoSelector2);
        if (additionalInfoElements2.length > 2) {
          const ResumeLong = await additionalInfoElements2[2].evaluate((el) =>
            el.textContent.trim().replace(/\n/g, "")
          );
          //   console.log({ additionalInfo });
          // Add the additional information to the localProductInfo object
          localProductInfo["Resume Long"] = ResumeLong;
        }
        const additionalInfoSelector6 = ".col-xmd-6";
        const additionalInfoElements6 = await page.$$(additionalInfoSelector6);
        if (additionalInfoElements6.length > 6) {
          const ResumeCourt = await additionalInfoElements6[6].evaluate((el) =>
            el.textContent.trim().replace(/\n/g, "")
          );
          //   console.log({ additionalInfo });
          // Add the additional information to the localProductInfo object
          localProductInfo["Resume Court"] = ResumeCourt;
        }

        //get images
        const imageSources = await page.$$eval(
          ".c-product-detail__thumb-image-wrapper img",
          (images) =>
            images
              .slice(0, 3)
              .map((img) => img.getAttribute("srcset"))
              .filter((srcset) => srcset !== null)
        );

        const quality = imageSources.map((src) => imageSizeFixer(src));
        const imagesPath = [];
        for (let i = 0; i < quality.length; i++) {
          downloadImage(quality[i]);
          let first = url.lastIndexOf("/") + 1;
          console.log("url", url);
          let last = url.lastIndexOf(".");
          let FileName = url.slice(first, last);
          console.log("FileName", FileName);
          let filePath = path.join(dirPath, FileName);
          console.log("filePath", filePath);

          imagesPath.push(filePath);
        }
        console.log("imagesPath:", imagesPath);
        localProductInfo["images"] = imagesPath;
        allProductInfo.push(localProductInfo);
        //console.log(localProductInfo);
        for (size of productSizeElements) {
          writeStream.write(
            `${localProductInfo["Product Ref"]};${localProductInfo["Product name"]};${localProductInfo["Brand name"]};${size};${localProductInfo["color"]};${localProductInfo["images"]};${localProductInfo["Resume Long"]};${localProductInfo["Resume Court"]};${localProductInfo["Description"]};${localProductInfo["price"]} \n`
          );
        }

        console.log(`Product found for code: ${code}`);
        rowValues.push("ok");
      } else {
        console.log(`Product not found for code: ${code}`);

        rowValues.push("ko");
      }

      updatedRows.push(rowValues.join(","));

      await sleep(2000);
    }

    await page.close();

    await browser.close(); // Update worksheet with the modified rows
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

extractEAN("./thirdone.xlsx"); // Replace with the correct file path
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const first = url.lastIndexOf("/") + 1;
      const last = url.indexOf("?");
      console.log("url", url);

      const newUrl = url.slice(first, last);
      console.log("newUrl", newUrl);
      const FileName = newUrl;
      let filePath;
      filePath = path.join(dirPath, FileName);
      if (filePath.includes("?"))
        filePath = filePath.slice(0, filePath.lastIndexOf("?"));
      const file = fs.createWriteStream(filePath);
      sleep(500);
      response.pipe(file);
      sleep(500);
      file.on("finish", () => {
        file.close();
        resolve(filePath);
      });
      file.on("error", (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });
  });
}
