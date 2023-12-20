const { Builder, By, Key, until, logging } = require("selenium-webdriver");

const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

require('events').EventEmitter.defaultMaxListeners = 3000;

const stream = require("stream");

const { promisify } = require("util");
const pipeline = promisify(stream.pipeline);

let options = new chrome.Options();
options.addArguments("headless"); // Running in headless mode
options.addArguments("disable-gpu"); // Recommended when running headless
options.addArguments("--disable-logging"); // This flag disables logging from the Chrome browser
options.addArguments("--log-level=3"); // Sets the log level to only include critical logs
// options.addArguments("--window-size=1920,1080"); // Set window size
// options.addArguments("--disable-extensions"); // Disable extensions
// options.addArguments('--proxy-server="direct://"'); // Avoid using proxy
// options.addArguments("--proxy-bypass-list=*"); // Bypass for local addresses
// options.addArguments("--start-maximized"); // Start maximized
// options.addArguments("--disable-dev-shm-usage"); // Overcome limited resource problems
// options.addArguments("--no-sandbox"); // Bypass OS security model
// options.addArguments("--disable-blink-features=AutomationControlled"); // Avoid detection
options.addArguments(
  "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
);

// options.setUserPreferences({ credential_enable_service: false });

// const prefs = new logging.Preferences();
// prefs.setLevel(logging.Type.BROWSER, logging.Level.SEVERE);

// options.setLoggingPrefs(prefs);

// driver.executeScript(
//   "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
// );

// let urls = [
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/dresses.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/cardigans-and-jumpers.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/tops.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/jackets-and-coats.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/trousers.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/nightwear.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/skirts.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/loungewear.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/hoodies-sweatshirts.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/shirts-and-blouses.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/jeans.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/blazers-and-waistcoats.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/jumpsuits-playsuits.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/premium-selection.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/accessories/bags.html",
//   "https://www2.hm.com/en_gb/ladies/shop-by-product/maternity-wear.html",
//   "https://www2.hm.com/en_gb/men/shop-by-product/jackets-and-coats.html",
//   "https://www2.hm.com/en_gb/men/shop-by-product/cardigans-and-jumpers.html",
//   "https://www2.hm.com/en_gb/men/shop-by-product/hoodies-sweatshirts.html",
//   "https://www2.hm.com/en_gb/men/shop-by-product/suits-blazers.html",
//   "https://www2.hm.com/en_gb/divided/shop-by-product/dresses.html",
//   "https://www2.hm.com/en_gb/kids/boys/clothing.html",
//   "https://www2.hm.com/en_gb/kids/girls-9-14y/clothing.html",
//   "https://www2.hm.com/en_gb/kids/boys-9-14y/clothing.html",
//   "https://www2.hm.com/en_gb/kids/girls/clothing.html",
// ];
// let urls = ["https://www2.hm.com/en_gb/ladies/shop-by-product/dresses.html"];

let urls = ["https://www.stradivarius.com/gb/women/clothing/partywear-n2327"];
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getProductLinksFromUrl(url) {
  let driver = new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();
  // console.log("Getting links");

  await driver.get(url);
  // console.log("URL visited");

  // const pageSource = await driver.getPageSource();

  // console.log(pageSource);

  let iterate = true;
  let previousOffset = 0;
  while (iterate) {
    await sleep(10000);
    const scrollPosition = await driver.executeScript(
      "window.scrollTo(0, document.body.scrollHeight);return window.pageYOffset;"
    );

    console.log(
      "Previous Offset:",
      previousOffset,
      ", ScrollPosition:",
      scrollPosition
    );

    if (scrollPosition != previousOffset) {
      previousOffset = scrollPosition;
    } else {
      iterate = false;
    }
  }

  await sleep(10000);

  const elems = await driver.findElements(By.css("#hrefRedirectProduct"));

  const links = await Promise.all(elems.map((e) => e.getAttribute("href")));
  console.log("Total Products:", elems.length, "Total Links:", links.length);

  driver.quit();
  const dirName = getDirectoryNameFromURL(url);
  await Promise.all(links.map((l) => getImagesFromUrl(l, dirName)));

  // if (pageSource.length < 3000) console.log(pageSource);
  // await sleep(3000);

  // let offsetY = 5678.39990234375;

  // await driver.executeScript(`window.scrollTo(0, ${offsetY}, { behavior: 'smooth' })`);
  // let scrollPosition = await driver.executeScript(
  //   "return window.pageYOffset;"
  // );
  // console.log("Scroll Position:", scrollPosition);

  // await driver.wait(until.elementLocated(By.css(".load-more-heading")), 30000);

  // const totalItemsHeading = (
  //   await driver.findElements(By.css(".load-more-heading"))
  // )[0];
  // console.log("Heading");
  // console.log(await totalItemsHeading.getAttribute('outerHTML'));
  // const loadMoreButton = (
  //   await driver.findElements(By.css("button.js-load-more"))
  // )[0];

  // console.log("Button");

  // let itemsShown = await totalItemsHeading.getAttribute("data-items-shown");
  // let itemsTotal = await totalItemsHeading.getAttribute("data-total");

  // itemsShown = parseInt(itemsShown);
  // itemsTotal = parseInt(itemsTotal);
  // console.log(`Shown=${itemsShown}, Total=${itemsTotal}`);

  // while (itemsShown != itemsTotal) {
  //   try {
  //     await loadMoreButton.click();
  //   } catch (err) {}
  //   await sleep(3000);

  // offsetY += 5678.39990234375;

  // await driver.executeScript(`window.scrollTo(0, ${offsetY})`);

  //   const newCount = parseInt(
  //     await totalItemsHeading.getAttribute("data-items-shown")
  //   );
  //   if (newCount != itemsShown) itemsShown = newCount;
  //   else break;

  //   console.log(`Shown=${itemsShown}, Total=${itemsTotal}`);
  // }

  // console.log("All Items Loaded");
  // await driver.wait(until.elementLocated(By.css(".item-link")), 30000);

  // const allProducts = await driver.findElements(By.css(".item-link"));

  // const links = allProducts.map(async (p) => await p.getAttribute("href"));

  // console.log(
  //   "Total products:",
  //   allProducts.length,
  //   ", Total Links: ",
  //   links.length
  // );

  // return links;

  // const categoryDirectoryName = getDirectoryNameFromURL(url);
  // const dir = createDirectory(categoryDirectoryName);
  // await getImagesFromUrl(url, categoryDirectoryName);

  // await sleep(15000);
  // console.log("15 seconds passed");
}

async function downloadImage(url, filepath) {
  const response = await axios({
    method: "GET",
    url: url,
    responseType: "stream",
  });

  await pipeline(response.data, fs.createWriteStream(filepath));

  console.log("Image downloaded");
}

async function getImagesFromUrl(url, categoryDirectoryName) {
  console.log("Going to get Images");

  let driver = new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  await driver.get(url);

  await sleep(5000);

  // await driver.wait(
  //   until.elementLocated(By.css(".multimedia-item-fade-in")),
  //   30000
  // );

  console.log("Waited 5 seconds for images");

  const elems = await driver.findElements(By.css(".multimedia-item-fade-in"));

  console.log("Total Images located:", elems.length);

  const imageUrls = await Promise.all(elems.map((e) => e.getAttribute("src")));

  driver.quit();

  if (imageUrls.length < 1) {
    throw Error("Image not found");
  }

  
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
}

async function main() {
  // await driver.manage().setTimeouts({ script: 60000 }); // Timeout in milliseconds

  await Promise.all(urls.map((url) => getProductLinksFromUrl(url)));

  // await driver.quit();
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
