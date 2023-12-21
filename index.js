const { Builder, By, Key, until, logging } = require("selenium-webdriver");

const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

require("events").EventEmitter.defaultMaxListeners = 3000;

const stream = require("stream");

const { promisify } = require("util");
const pipeline = promisify(stream.pipeline);

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

const http = require("http");

function getMetadata(key) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "metadata.google.internal",
      path: `/computeMetadata/v1/instance/attributes/${key}`,
      headers: { "Metadata-Flavor": "Google" },
    };

    http
      .get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", (err) => reject(err));
  });
}

// let urls = [
//   "https://www.stradivarius.com/gb/women/clothing/partywear-n2327",
//   "https://www.stradivarius.com/gb/women/clothing/partywear-n2327",
//   "https://www.stradivarius.com/gb/old-money-n4439?celement=1020565670",
//   "https://www.stradivarius.com/gb/woman/clothing/shop-by-product/shearling-jacket-c1020566660.html",
//   "https://www.stradivarius.com/gb/women/clothing/faux-leather-n3297",
//   "https://www.stradivarius.com/gb/women/clothing/coats-n1926",
//   "https://www.stradivarius.com/gb/women/clothing/jackets-n1943",
//   "https://www.stradivarius.com/gb/woman/clothing/trench-coats-n3787",
//   "https://www.stradivarius.com/gb/women/clothing/blazers-n1931",
//   "https://www.stradivarius.com/gb/women/clothing/jeans-n1953",
//   "https://www.stradivarius.com/gb/women/clothing/trousers-n1966",
//   "https://www.stradivarius.com/gb/women/clothing/skirts-n1950",
//   "https://www.stradivarius.com/gb/women/clothing/knit-n1976",
//   "https://www.stradivarius.com/gb/women/clothing/tops-and-bodysuits-n1990",
//   "https://www.stradivarius.com/gb/women/clothing/t-shirts-n2029",
//   "https://www.stradivarius.com/gb/women/clothing/dresses-n1995",
//   "https://www.stradivarius.com/gb/women/clothing/shirts-n1932",
//   "https://www.stradivarius.com/gb/women/clothing/sweatshirts-n1989?celement=1718524",
//   "https://www.stradivarius.com/gb/women/clothing/shorts-n1983",
//   "https://www.stradivarius.com/gb/woman/basics-n3771",
//   "https://www.stradivarius.com/gb/women/str-teen-n2283",
//   "https://www.stradivarius.com/gb/women/sportswear-n1912",
//   "https://www.stradivarius.com/gb/women/accessories/bags-and-backpacks-n1886",
//   "https://www.stradivarius.com/gb/women/accessories/glasses-n1895",
//   "https://www.stradivarius.com/gb/women/accessories/caps-and-hats-n2042",
// ];

let processed;

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
    if (!processed[url])
      processed[url] = { total: elems.length, processed: 0, products: {} };
  }

  await driver.quit();
  const dirName = getDirectoryNameFromURL(url);

  for (let link of links) {
    if (!processed[url].products[link])
      await getImagesFromUrl(link, dirName, url);
  }
}

function updateProcessed() {
  // Convert the data to a JSON string
  const jsonString = JSON.stringify(processed, null, 2); // The second argument (null) and third argument (2) are for pretty-printing

  // Synchronously write the JSON string to a file
  fs.writeFileSync("processed.json", jsonString, "utf8");
}

async function downloadImage(url, filepath) {
  try {
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
      },
    });

    await pipeline(response.data, fs.createWriteStream(filepath));
  } catch (err) {
    console.log("------------------Axios Error occured-----------------");
    console.log(err);
    updateProcessed();
  }
  // console.log("Image downloaded");
}

async function getImagesFromUrl(url, categoryDirectoryName, categoryUrl) {
  await driver.get(url);

  await sleep(20000);

  const elems = await driver.findElements(By.css(".image-zoom-container img"));

  console.log("Total Images located:", elems.length, "Url: ", url);

  if (elems.length < 1) {
    const pageSource = await driver.getPageSource();
    if (pageSource.length < 3000) console.log(pageSource);
    else console.log("Source is alright");
  }

  const imageUrls = await Promise.all(elems.map((e) => e.getAttribute("src")));

  await driver.quit();

  const productDirectoryName = getDirectoryNameFromURL(url);

  const dir = await createDirectory(
    `${categoryDirectoryName}/${productDirectoryName}`
  );

  let imageCount = 0;

  await Promise.all(
    imageUrls.map((src) => {
      const filePath = `${dir}/${imageCount}.jpg`;
      imageCount++;
      return downloadImage(src, filePath);
    })
  );

  if (imageUrls.length > 0) {
    processed[categoryUrl].products[url] = true;
    processed[categoryUrl].processed += 1;
  }
}

async function main() {
  try {
    createProcessedFile();

    const url = await getMetadata("url");
    console.log("Custom URL:", url);

    if (!processed[url] || processed[url].total != processed[url].processed) {
      await getProductLinksFromUrl(url);
    } else {
      console.log("Processed:", processed);
      console.log("Processed[url]:", processed[url]);
    }
  } catch (error) {
    console.error("Error fetching metadata:", error);
  }
}

function createDirectory(dirName) {
  const dir = path.join(path.join(path.join(__dirname, "images"), dirName));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  } else {
    fs.mkdirSync(`${dir}_${Date.now()}`, { recursive: true });
  }
  return dir;
}

function getDirectoryNameFromURL(href) {
  const url = new URL(href);
  const pathSegments = url.pathname.split("/");
  return pathSegments[pathSegments.length - 1].split(".")[0]; // 'slit-knitted-skirt_67050459'
}

main()
  .then(() => {
    console.log("Process completed");
  })
  .catch((err) => {
    console.log("Error occured:", err);
  });
