const xlsx = require("xlsx");
const puppeteer = require("puppeteer");
const ObjectsToCsv = require("objects-to-csv");
const { textContent } = require("domutils");

const https = require("https");

const fs = require("fs");

const path = require("path");
function imageSizeFixer(imageUrl) {
  let newImageUrl = imageUrl.replace("sw=80&sh=80", "sw=800&sh=800");

  newImageUrl = newImageUrl.replace("80w", "");
  newImageUrl = newImageUrl.replace(/\s+/g, "");

  return newImageUrl;
}
const waitForSelectorOptions = { timeout: 900000 };
let localProductInfo = {};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function extractEAN(excelFilePath) {
  try {
    const workbook = xlsx.readFile(excelFilePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const csvData = xlsx.utils
      .sheet_to_csv(worksheet, { header: 1 })
      .trim()
      .split("\n");

    // Find the column index of "EAN Article"
    const headerRow = csvData[0].split(",");
    const eanColumnIndex = headerRow.findIndex(
      (header) => header === "EAN Article"
    );

    // Extract values from "EAN Article" column
    const eanArray = csvData
      .slice(1)
      .map((row) => row.split(",")[eanColumnIndex]);

    // Replace specific codes
    const replacements = {
      "4.04443E+12": "4044426557270",
      "4.06052E+12": "4060515412015",
    };

    const updatedEanArray = eanArray.map((ean) => replacements[ean] || ean);

    // Divide the updatedEanArray into batches of 200
    const batchSize = 200;
    const dividedArrays = [];
    for (let i = 0; i < updatedEanArray.length; i += batchSize) {
      const batch = updatedEanArray.slice(i, i + batchSize);
      dividedArrays.push(batch);
    }

    console.log("Divided arrays:", dividedArrays);

    const browser = await puppeteer.launch({
      headless: false,
      timeout: 120000,
    });

    const results = [];

    for (const batch of dividedArrays) {
      const batchResults = [];

      const page = await browser.newPage();
      await page.goto("https://www.go-sport.com/");

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

      for (const code of batch) {
        await page.waitForSelector(searchBarSelector, waitForSelectorOptions);
        await page.$eval(searchBarSelector, (element) => (element.value = ""));
        await page.type(searchBarSelector, code);
        await sleep(5000);
        const searchResults = await page.$(searchResultsSelector);
        if (searchResults) {
          searchResults.click();
          // Get product brand name
          const brandNameSelector = ".c-product-detail__brand";
          await page.waitForSelector(brandNameSelector, waitForSelectorOptions);
          const brandNameElement = await page.$(brandNameSelector);
          const brandName = await brandNameElement.evaluate((el) =>
            el.textContent.trim()
          );
          // console.log({ brandName });
          localProductInfo["Brand name"] = brandName;

          // Get product name
          const productNameSelector = ".c-product-detail__name";
          await page.waitForSelector(
            productNameSelector,
            waitForSelectorOptions
          );
          const productNameElement = await page.$(productNameSelector);
          const productName = await productNameElement.evaluate((el) =>
            el.textContent.trim()
          );
          // console.log({ productName });
          localProductInfo["Product name"] = productName;

          // Get product description
          const productDescriptionSelector =
            ".c-product-detail__content .content";
          await page.waitForSelector(
            productDescriptionSelector,
            waitForSelectorOptions
          );
          const productDescriptionElement = await page.$(
            productDescriptionSelector
          );
          const productDescription = await productDescriptionElement.evaluate(
            (el) => el.textContent.replace(/\r?\n|\r/g, "")
          );
          // console.log({ productDescription });
          localProductInfo["Description"] = productDescription;

          // Get product price
          const productPriceSelector = ".c-prices__sales";
          await page.waitForSelector(
            productPriceSelector,
            waitForSelectorOptions
          );
          const productPriceElement = await page.$(productPriceSelector);
          const productPrice = await productPriceElement.evaluate((el) =>
            el.textContent.replace(/^\s*$(?:\r\n?|\n)/gm, "").slice(0, -3)
          );
          // console.log({ productPrice });
          localProductInfo["price"] = productPrice;

          // Get product sizes
          const productSizeSelector = "[data-attr-id='size_vendeur'] > span";
          await page.waitForSelector(
            productSizeSelector,
            waitForSelectorOptions
          );
          const productSizeElements = await page.$$(productSizeSelector);
          const productSizes = [];
          for (const element of productSizeElements) {
            try {
              const productSize = await element.evaluate((el) =>
                el.textContent.trim()
              );
              productSizes.push(productSize);
            } catch (error) {
              console.error(
                "Error occurred while getting product size:",
                error
              );
            }
          }
          // console.log(productSizes);
          // Get resume
          const resumeLongList = [];
          const resumeCourtList = [];

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
            } else if (infoKey === "Genre") {
              localProductInfo["main Category"] = infoValue;
            } else if (infoKey === "Couleur") {
              resumeLongList.push("Couleur:" + infoValue);
              localProductInfo["Resume Long"] = resumeLongList;
            } else if (infoKey === "Niveau") {
              resumeLongList.push("Niveau:" + infoValue);
              localProductInfo["Resume Long"] = resumeLongList;
            } else if (infoKey === "Composition") {
              resumeCourtList.push("Composition :" + infoValue);
              localProductInfo["Resume Court"] = resumeCourtList;
            } else if (infoKey === "Poids") {
              resumeCourtList.push("Poids : " + infoValue);
              localProductInfo["Resume Court"] = resumeCourtList;
            } else if (infoKey === "Type") {
              resumeCourtList.push("Type :" + infoValue);
              localProductInfo["Resume Court"] = resumeCourtList;
            }

            // console.log(infoValue);
          }
          //get images
          const imageSources = await page.$$eval(
            ".c-product-detail__thumb-image",
            (images) =>
              images
                .slice(0, 3)
                .map((img) => img.getAttribute("srcset"))
                .filter((srcset) => srcset !== null)
          );

          const result = imageSources.length > 0 ? imageSources : ["[___]"];
          const quality = result.map((src) => imageSizeFixer(src));
          localProductInfo["images"] = quality;
          console.log(`Product found for code: ${code}`);
          console.log(localProductInfo);

          batchResults.push({ code, status: "ok" });
        } else {
          console.log(`Product not found for code: ${code}`);
          batchResults.push({ code, status: "ko" });
        }

        await sleep(2000);
      }

      results.push(batchResults);
      await page.close();
    }

    await browser.close();

    // Write results to a CSV file
    const csv = new ObjectsToCsv(results.flat());
    await csv.toDisk("./results.csv");

    console.log("Results saved to results.csv");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

extractEAN("./POC ECOM MIM (5).xlsx"); // Replace with the
