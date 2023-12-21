const { Builder, By, Key, until, logging } = require("selenium-webdriver");
const { exec } = require("child_process");

const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();

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

async function uploadFile(bucketName, filename, destination) {
  // Uploads a file to the bucket
  await storage.bucket(bucketName).upload(filename, {
    // Support for HTTP requests made with `Accept-Encoding: gzip`
    gzip: true,
    // By setting the option `destination`, you can change the name of the
    // object you are uploading to a bucket.
    destination: destination,
    metadata: {
      // Enable long-lived HTTP caching headers
      // Use only if the contents of the file will never change
      // (If the contents will change, use cacheControl: 'no-cache')
      cacheControl: "public, max-age=31536000",
    },
  });

  console.log(`${filename} uploaded to ${bucketName}.`);
}

async function uploadDirectory(
  localFolderPath,
  bucketName,
  bucketFolderPath = ""
) {
  const files = fs.readdirSync(localFolderPath);

  for (const file of files) {
    const localFilePath = path.join(localFolderPath, file);
    const bucketFilePath = path.join(bucketFolderPath, file);

    if (fs.lstatSync(localFilePath).isDirectory()) {
      await uploadDirectory(localFilePath, bucketFilePath);
    } else {
      await storage.bucket(bucketName).upload(localFilePath, {
        destination: bucketFilePath,
        gzip: true, // Optional, for gzip compression
      });
      // console.log(`Uploaded ${localFilePath} to ${bucketFilePath}`);
    }
  }
}

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

function updateProcessed() {
  // Convert the data to a JSON string
  const jsonString = JSON.stringify(processed, null, 2); // The second argument (null) and third argument (2) are for pretty-printing

  // Synchronously write the JSON string to a file
  fs.writeFileSync("processed.json", jsonString, "utf8");
}

async function downloadImage(url, filepath) {
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
      // The request was made but no response was received
      console.log("Error Request:", error.request);
    } else {
      // Something happened in setting up the request that triggered an error
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
  try {
    createProcessedFile();

    const url = await getMetadata("url");
    const brand = await getMetadata("brand");

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

function shutdownSystem() {
  exec("sudo shutdown now", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
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
    shutdownSystem();
  })
  .catch((err) => {
    console.log("Error occured:", err);
  });
