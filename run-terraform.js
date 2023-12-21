const { exec } = require("child_process");
const fs = require("fs");

// Function to run a Terraform command
function runTerraformCommand(command) {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Stdout: ${stdout}`);
  });
}

// Read URLs or other inputs
let urls = [
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
  "https://www.stradivarius.com/gb/women/accessories/glasses-n1895",
//   "https://www.stradivarius.com/gb/women/accessories/caps-and-hats-n2042",
];

// Write the URLs to a Terraform variables file or use another method to pass them
const terraformVars = `instance_urls = ${JSON.stringify(urls)}`;
fs.writeFileSync("terraform.tfvars", terraformVars);

// Run Terraform Init and Apply
runTerraformCommand("terraform init");
runTerraformCommand("terraform apply -auto-approve");
