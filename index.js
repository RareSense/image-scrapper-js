const { Builder, By, until, logging } = require("selenium-webdriver");

const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");

require("events").EventEmitter.defaultMaxListeners = 3000;

const {
  uploadDirectory,
  getDirectoryNameFromURL,
  createDirectory,
  downloadImage,
  getMetadata,
  uploadFile,
  shutdownSystem,
} = require("./utlis");

let options = new chrome.Options();
options.addArguments("headless"); // Running in headless mode
options.addArguments("disable-gpu"); // Recommended when running headless
options.addArguments("--disable-logging"); // This flag disables logging from the Chrome browser
options.addArguments("--log-level=3"); // Sets the log level to only include critical logs
options.addArguments("--window-size=1920,1080"); // Set window size
options.addArguments("--disable-extensions"); // Disable extensions
// options.addArguments('--proxy-server="direct://"'); // Avoid using proxy
// options.addArguments("--proxy-bypass-list=*"); // Bypass for local addresses
options.addArguments("--start-maximized"); // Start maximized
options.addArguments("--disable-dev-shm-usage"); // Overcome limited resource problems
options.addArguments("--no-sandbox"); // Bypass OS security model
options.addArguments("--disable-blink-features=AutomationControlled"); // Avoid detection
options.addArguments(
  "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
);

let driver = new Builder()
  .forBrowser("chrome")
  .setChromeOptions(options)
  .build();

let processed;

function updateProcessed() {
  const jsonString = JSON.stringify(processed, null, 2);
  fs.writeFileSync("processed.json", jsonString, "utf8");
}

function createProcessedFile() {
  if (fs.existsSync("processed.json")) {
    const data = fs.readFileSync("processed.json", "utf8");
    processed = JSON.parse(data);
  } else {
    processed = {}; // or some default value
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getProductLinksFromUrl(url) {
  if (processed[url] && processed[url].total === processed[url].processed) {
    return;
  }

  console.log("Scrapping started...!");

  await driver.get(url);

  let iterate = true;
  let previousOffset = 0;

  while (iterate) {
    await sleep(4000);
    const scrollPosition = await driver.executeScript(
      "window.scrollTo(0, document.body.scrollHeight);return window.pageYOffset;"
    );

    if (scrollPosition != previousOffset) {
      previousOffset = scrollPosition;
    } else {
      console.log("ScrollPosition:", scrollPosition);

      if (scrollPosition < 500) {
        const pageSource = await driver.getPageSource();
        if (pageSource.length < 3000) console.log(pageSource);
        else console.log("Source is alright");
      }
      iterate = false;
    }
  }

  await sleep(5000);

  const elems = await driver.findElements(
    By.css(".product-link.product-grid-product__link.link")
  );

  let links = await Promise.all(elems.map((e) => e.getAttribute("href")));

  console.log("Elems found:", elems.length, "Total found:", links.length);

  if (elems.length > 1 && elems.length === links.length) {
    if (!processed[url]) {
      processed[url] = {
        total: 0,
        processed: 0,
        toProcess: {},
        failed: {},
      };
      let count = 0;
      for (let link of links) {
        if (processed[url].toProcess[link]) {
          console.log("Duplicated link");
          count++;
        } else processed[url].toProcess[link] = 1;
      }

      const total = Object.keys(processed[url].toProcess).length;

      processed[url].total = total;

      console.log("Total Links to process:", total, "Duplicated Links:", count);
    }
  }

  const dirName = getDirectoryNameFromURL(url);

  for (let link of Object.keys(processed[url].toProcess)) {
    await getImagesFromUrl(link, dirName, url);
  }
}

function getHighestResolutionUrl(srcset) {
  let urls = srcset.split(", ");
  let highestResUrl = "";
  let maxRes = 0;

  for (let url of urls) {
    let parts = url.split(" ");
    let res = parseInt(parts[1].replace("w", ""));

    if (res > maxRes) {
      maxRes = res;
      highestResUrl = parts[0];
    }
  }

  return highestResUrl;
}

async function getImagesFromUrl(url, categoryDirectoryName, categoryUrl) {
  await driver.get(url);

  await sleep(1000);

  let pictureElements = await driver.findElements(By.tagName("picture"));

  let imageUrls = [];
  for (let picture of pictureElements) {
    let srcset = await picture
      .findElement(By.tagName("source"))
      .getAttribute("srcset");
    let highestResUrl = getHighestResolutionUrl(srcset);
    imageUrls.push(highestResUrl);
  }

  console.log(
    "Total Images located:",
    imageUrls.length,
    "=",
    pictureElements.length
  );

  if (imageUrls.length < 1) {
    const pageSource = await driver.getPageSource();
    if (pageSource.length < 3000) console.log(pageSource);
    else console.log("Source is alright");
  }

  // const imageUrls = await Promise.all(elems.map((e) => e.getAttribute("src")));

  const productDirectoryName = getDirectoryNameFromURL(url);

  const dir = createDirectory(
    `${categoryDirectoryName}/${productDirectoryName}`
  );

  console.log("Dir:", dir);

  let imageCount = 0;

  try {
    await Promise.all(
      imageUrls.map((src) => {
        const filePath = `${dir}/${imageCount}.jpg`;
        imageCount++;
        return downloadImage(src, filePath);
      })
    );
    if (imageUrls.length > 0) {
      delete processed[categoryUrl].toProcess[url];
      processed[categoryUrl].processed += 1;
    } else {
      processed[categoryUrl].toProcess[url] = "Images not found";
    }
  } catch (error) {
    console.log("------------------Axios Error occured-----------------");
    processed[categoryUrl].failed[url] = 1;
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log("Error Data:", error.response.data);
      console.log("Error Status:", error.response.status);
      console.log("Error Headers:", error.response.headers);
      processed[categoryUrl].failed[url] = error.response.status;
    } else if (error.request) {
      console.log("Error Request:", error.request);
    } else {
      console.log("Error Message:", error.message);
    }

    console.log("Error Config:", error.config);
  }

  console.log(
    "Total:",
    processed[categoryUrl].total,
    "Processed:",
    processed[categoryUrl].processed,
    "Failed:",
    Object.keys(processed[categoryUrl].failed)
  );
}

async function main() {
  let url;
  let brand;
  try {
    createProcessedFile();

    url = await getMetadata("url");
    brand = await getMetadata("brand");

    // url =
    //   "https://www.zara.com/ww/en/woman-outerwear-padded-l1195.html?v1=2290717";
    // brand = "zara";

    if (!processed[url] || processed[url].total != processed[url].processed) {
      await getProductLinksFromUrl(url);
      await uploadDirectory("images", "rs_fashion_dataset", brand);
    } else {
      console.log("Processed:", processed);
      console.log("Processed[url]:", processed[url]);
    }
  } catch (error) {
    console.error("Error fetching metadata:", error);
  } finally {
    updateProcessed();

    await uploadFile(
      "rs_fashion_dataset",
      "processed.json",
      brand + "/" + getDirectoryNameFromURL(url) + "/" + "processed.json"
    );
  }

  await driver.quit();
}

main()
  .then(() => {
    console.log("Process completed");
    shutdownSystem();
  })
  .catch((err) => {
    console.log("Error occured:", err);
  });
