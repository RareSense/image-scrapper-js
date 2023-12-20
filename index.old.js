const { Builder, By, Key, until } = require("selenium-webdriver");

const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const stream = require("stream");

const { promisify } = require("util");
const pipeline = promisify(stream.pipeline);

const toVisit = "https://shop.mango.com/in/girls/shorts-and-skirts_c90317776";

function createDirectory(dirName) {
  const dir = path.join(
    path.join(path.join(__dirname, "images"), getDirectoryNameFromURL(toVisit)),
    dirName
  );

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  } else {
    fs.mkdirSync(dir + Date.now(), { recursive: true });
  }
  return dir;
}

async function scrapeWebsite() {
  let options = new chrome.Options();
  options.addArguments("headless"); // Running in headless mode
  options.addArguments("disable-gpu"); // Recommended when running headless
  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    // Navigate to the website
    await driver.get(toVisit);

    let elements = [];

    let urls = [];

    let previousLength = 0;

    let yOffset = 106.4;

    let count = 0;
    while (elements.length == 0 || elements.length > previousLength) {
      previousLength = elements.length;

      // Example: Scroll down
      if ((count + 1) % 4 == 0) {
        yOffset += 660.93;
        await driver.executeScript(`window.scrollTo(0, ${yOffset})`);

        let scrollPosition = await driver.executeScript(
          "return window.pageYOffset;"
        );

        console.log("Scroll Position:", scrollPosition);
      }

      // Example: Wait for an element to be present
      const selector = `[data-testid='plp.product-${count}.link']`;

      try {
        await driver.wait(until.elementLocated(By.css(selector)), 15000);
      } catch (err) {
        console.log("Can't wait for next element");
      }

      elements = [
        ...elements,
        ...(await driver.findElements(By.css(selector))),
      ];

      console.log("Total Main Links=", elements.length);

      count++;
    }

    for (let element of elements) {
      const href = await element.getAttribute("href");
      urls.push(href);
    }

    for (let url of urls) {
      await driver.get(url);
      try {
        await driver.wait(until.elementLocated(By.css(".image-js")), 30000);
        const directoryName = getDirectoryNameFromURL(url);
        const dir = createDirectory(directoryName);

        const images = await driver.findElements(By.css(".image-js"));
        for (let i = 0; i < images.length; i++) {
          const imageUrl = await images[i].getAttribute("src");
          const imageFilename = path.join(dir, `image${i}.jpg`); // Saving as image0.jpg, image1.jpg, etc.
          await downloadImage(imageUrl, imageFilename);
          console.log(`Downloaded ${imageFilename}`);
        }
        console.log("Images", images.length);
      } catch (e) {
        console.log(e);
      }
    }
  } finally {
    await driver.quit();
  }
}

async function downloadImage(url, filepath) {
  const response = await axios({
    method: "GET",
    url: url,
    responseType: "stream",
  });
  await pipeline(response.data, fs.createWriteStream(filepath));
}

function getDirectoryNameFromURL(href) {
  const url = new URL(href);
  const pathSegments = url.pathname.split("/");
  return pathSegments[pathSegments.length - 1].split(".")[0]; // 'slit-knitted-skirt_67050459'
}

// scrapeWebsite().then(() => {
//   console.log("Scrapping completed");
// });
