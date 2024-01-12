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

async function getProductLinksFromUrl(url, queryDirectoryName) {
  if (processed[url] && processed[url].total === processed[url].processed) {
    return;
  }

  let queryDirectoryPath = createDirectory(queryDirectoryName);

  console.log("Scrapping started...!");

  await driver.get(url);

  await sleep(10000);

  let iterate = true;
  let previousOffset = 0;

  let totalElems = 0;
  let allLinks = [];
  let allElems = [];
  while (iterate) {
    const elems = await driver.findElements(By.css("a[href^='/pin/']"));

    let links = await Promise.all(elems.map((e) => e.getAttribute("href")));

    allLinks = [...allLinks, ...links];
    allElems = [...allElems, ...elems];
    totalElems += links.length;
    console.log(
      "Elems found:",
      elems.length,
      ",Links found:",
      links.length,
      ",Total Links:",
      totalElems
    );

    await sleep(10000);
    const scrollPosition = await driver.executeScript(
      "window.scrollTo(0, document.body.scrollHeight);return window.pageYOffset;"
    );

    if (scrollPosition != previousOffset) {
      console.log("ScrollPosition:", scrollPosition);
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

  if (allElems.length > 1 && allElems.length === allLinks.length) {
    if (!processed[url]) {
      processed[url] = {
        total: 0,
        processed: 0,
        toProcess: {},
        failed: {},
      };
      let count = 0;
      for (let link of allLinks) {
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

  let iteration = 0;
  for (let link of Object.keys(processed[url].toProcess)) {
    iteration++;
    await getImagesFromUrl(link, queryDirectoryPath, url, iteration);
  }
  // await Promise.all([
  //   Object.keys(processed[url].toProcess).map((link) => {
  //     iteration++;
  //     console.log("Total Iterations:", iteration);
  //     // return getImagesFromUrl(link, queryDirectoryPath, url, iteration);
  //   }),
  // ]);
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

async function getImagesFromUrl(
  url,
  categoryDirectoryName,
  categoryUrl,
  iteration
) {
  await driver.get(url);

  await sleep(10000);

  let imgElements = await driver.findElements(
    By.css("[data-test-id='pin-closeup-image'] img")
  );

  try {
    let imageUrl = await imgElements[0]?.getAttribute("src");
    if (!imageUrl) {
      processed[categoryUrl].toProcess[url] = "Image not found";
      processed[categoryUrl].failed[url] = "Image not found";
      return;
    }
    const filePath = `${categoryDirectoryName}/${iteration}.jpg`;
    await downloadImage(imageUrl, filePath);

    delete processed[categoryUrl].toProcess[url];
    processed[categoryUrl].processed += 1;
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
  let query;
  try {
    createProcessedFile();

    // query = "fashion editorial";
    // brand = "pinterest";

    query = await getMetadata("keyword");
    brand = await getMetadata("brand");

    

    url = `https://www.pinterest.com/search/pins/?q=${query
      .split(" ")
      .join("%20")}`;

    if (!processed[url] || processed[url].total != processed[url].processed) {
      await getProductLinksFromUrl(url, query.split(" ").join("-"));
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
      brand + "/" + query.split(" ").join("-") + "/" + "processed.json"
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
