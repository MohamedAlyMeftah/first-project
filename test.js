let allDetails = []
const details = await page.evaluate(async () => {
    const regex = /[\n\r]+|[\s]{2,}/g;
  
    const infos = {
      ref:
        (document.querySelector(
          "#c-product-detail__attributes > div > div > div > div:nth-child(1) > p.c-attribute__value"
        )?.textContent.replace(regex, "") || "___"),
      name:
        (document.querySelector(
          "#maincontent > div > div:nth-child(2) > div.col-12.col-xmd-6.c-product-detail__infos > div.c-product-detail__name-section.m-xmd-0 > h1"
        )?.textContent.replace(regex, "") || "___"),
      brand:
        (document.querySelector(
          "#c-product-detail__attributes > div > div > div > div:nth-child(3) > p.c-attribute__value"
        )?.textContent.replace(regex, "") || "___"),
      sizes:
        Array.from(document.querySelectorAll(".c-variation__attr-wrapper a"))
          .map((a) => a.textContent.replace(regex, ""))
          .filter((text) => text !== "") || ["[___]"],
      color:
        (document.querySelector(".js-expandable-attribute")?.textContent.replace(regex, "") || "___"),
      category: "homme",
      imgs:
        Array.from(document.querySelectorAll(".c-product-detail__thumb-image"))
          .map((img) => img.getAttribute("srcset"))
          .filter((srcset) => srcset !== null)
          .slice(0, 3) || ["[___]"],
      description:
        (document.querySelector("#collapsible-description-1")?.textContent.replace(regex, "") || "___"),
      price:
        (document.querySelector(".value")?.textContent.replace(regex, "") || "___"),
    };
  
    return infos;
  });
  
  allDetails.push(details);
  } catch (error) {
    writeToExcelFile(allDetails);
    console.log(error);
  }
  
  writeToExcelFile(allDetails);
