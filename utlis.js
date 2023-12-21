const http = require("http");
const { exec } = require("child_process");
const path = require("path");
const axios = require("axios");
const fs = require("fs");



const stream = require("stream");

const { promisify } = require("util");


const { Storage } = require("@google-cloud/storage");
const storage = new Storage();

const pipeline = promisify(stream.pipeline);

 function createDirectory(dirName) {
  const dir = path.join(path.join(path.join(__dirname, "images"), dirName));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  } else {
    fs.mkdirSync(`${dir}-${Date.now()}`, { recursive: true });
  }
  return dir;
}

 function getDirectoryNameFromURL(href) {
  const url = new URL(href);
  const pathSegments = url.pathname.split("/");
  return pathSegments[pathSegments.length - 1].split(".")[0]; // 'slit-knitted-skirt_67050459'
}

 function shutdownSystem() {
  exec("sudo shutdown -h 10", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
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
      await uploadDirectory(localFilePath, bucketName, bucketFilePath);
    } else {
      await storage.bucket(bucketName).upload(localFilePath, {
        destination: bucketFilePath,
        gzip: true, // Optional, for gzip compression
      });
    }
  }
}

 async function uploadFile(bucketName, filename, destination) {
  await storage.bucket(bucketName).upload(filename, {
    gzip: true,
    destination: destination,
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });

  console.log(`${filename} uploaded to ${bucketName}.`);
}


module.exports={
    uploadDirectory,
    uploadFile,
    downloadImage,
    getMetadata,
    getDirectoryNameFromURL,
    shutdownSystem,
    createDirectory
}