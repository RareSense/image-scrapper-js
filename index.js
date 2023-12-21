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
    await sleep(10000);
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

  await sleep(10000);

  const elems = await driver.findElements(By.css("#hrefRedirectProduct"));

  let links = await Promise.all(elems.map((e) => e.getAttribute("href")));

  console.log("Total Products:", elems.length, "Total Links:", links.length);

  if (elems.length > 1 && elems.length === links.length) {
    if (!processed[url]) {
      processed[url] = {
        total: elems.length,
        processed: 0,
        toProcess: {},
        failed: {},
      };
      for (let link of links) {
        processed[url].toProcess[link] = 1;
      }
    }
  }

  const dirName = getDirectoryNameFromURL(url);

  for (let link of links) {
    if (processed[url].toProcess[link])
      await getImagesFromUrl(link, dirName, url);
  }
}

async function getImagesFromUrl(url, categoryDirectoryName, categoryUrl) {
  await driver.get(url);

  await sleep(40000);

  const elems = await driver.findElements(By.css(".image-zoom-container img"));

  console.log("Total Images located:", elems.length);

  if (elems.length < 1) {
    const pageSource = await driver.getPageSource();
    if (pageSource.length < 3000) console.log(pageSource);
    else console.log("Source is alright");
  }

  const imageUrls = await Promise.all(elems.map((e) => e.getAttribute("src")));

  const productDirectoryName = getDirectoryNameFromURL(url);

  const dir = createDirectory(
    `${categoryDirectoryName}/${productDirectoryName}`
  );

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
