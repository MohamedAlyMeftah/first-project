const xlsx = require("xlsx");
const puppeteer = require("puppeteer");
const writeToExcelFile = require("./helper");

let allDetails = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitForSelectorOptions = { timeout: 60000 };
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

    console.log("EAN Article array:", updatedEanArray);

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://www.go-sport.com/");

    const cookieButtonSelector = "#onetrust-accept-btn-handler";
    await page.waitForSelector(cookieButtonSelector);
    const cookieButton = await page.$(cookieButtonSelector);

    if (cookieButton) {
      await cookieButton.click();
      await sleep(3000);
    } else {
      console.log("Cookie button not found");
    }

    const searchBarSelector = ".js-c-search-field";
    const searchResultsSelector =
      ".c-suggestions__link.c-link.c-link--no-underline.c-link--arrow-icon";
    for (const code of updatedEanArray) {
      // await page.click(searchBarSelector);
      await page.waitForSelector(".js-c-search-field", waitForSelectorOptions);
      await page.$eval(searchBarSelector, (element) => (element.value = ""));
      await page.type(searchBarSelector, code);
      await sleep(5000);
      const searchResults = await page.$(searchResultsSelector);
      if (searchResults) {
        await searchResults.click();

        console.log(`Product found for code: ${code}`);

        // Extract the product details here
        await page.evaluate(async () => {
          const regex = /[\n\r]+|[\s]{2,}/g;
          const infos = {
            ref:
              document
                .querySelector(
                  "#c-product-detail__attributes > div > div > div > div:nth-child(1) > p.c-attribute__value"
                )
                ?.textContent.replace(regex, "") || "___",
            name:
              document
                .querySelector(
                  "#maincontent > div > div:nth-child(2) > div.col-12.col-xmd-6.c-product-detail__infos > div.c-product-detail__name-section.m-xmd-0 > h1"
                )
                ?.textContent.replace(regex, "") || "___",
            brand:
              document
                .querySelector(
                  "#c-product-detail__attributes > div > div > div > div:nth-child(3) > p.c-attribute__value"
                )
                ?.textContent.replace(regex, "") || "___",
            sizes: Array.from(
              document.querySelectorAll(".c-variation__attr-wrapper a")
            )
              .map((a) => a.textContent.replace(regex, ""))
              .filter((text) => text !== "") || ["[___]"],
            color:
              document
                .querySelector(".js-expandable-attribute")
                ?.textContent.replace(regex, "") || "___",
            category: "homme",
            imgs: Array.from(
              document.querySelectorAll(".c-product-detail__thumb-image")
            )
              .map((img) => img.getAttribute("srcset"))
              .filter((srcset) => srcset !== null)
              .slice(0, 3) || ["[___]"],
            description:
              document
                .querySelector("#collapsible-description-1")
                ?.textContent.replace(regex, "") || "___",
            price:
              document
                .querySelector(".value")
                ?.textContent.replace(regex, "") || "___",
          };
          return infos;
        });
        allDetails.push(details);
        writeToExcelFile(allDetails);

        // ...

        // Go back to the search page

        await sleep(5000);
      } else {
        console.log(`Product not found for code: ${code}`);
      }

      await sleep(2000);
    }

    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

extractEAN("./POC ECOM MIM (5).xlsx"); // Replace with the path to your Excel file
