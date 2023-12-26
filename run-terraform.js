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
  "https://www.zara.com/ww/en/woman-outerwear-padded-l1195.html?v1=2290717",
  "https://www.zara.com/ww/en/woman-outerwear-l1184.html?v1=2290701",
  "https://www.zara.com/ww/en/woman-jackets-l1114.html?v1=2290770",
  "https://www.zara.com/ww/en/woman-blazers-l1055.html?v1=2290737",
  "https://www.zara.com/ww/en/woman-outerwear-vests-l1204.html?v1=2290782",
  "https://www.zara.com/ww/en/woman-dresses-l1066.html?v1=2290847&page=6",
  "https://www.zara.com/ww/en/woman-knitwear-l1152.html?v1=2346647",
  "https://www.zara.com/ww/en/woman-tops-l1322.html?v1=2291012",
  "https://www.zara.com/ww/en/woman-knitwear-l1152.html?v1=2291084",
  "https://www.zara.com/ww/en/woman-shirts-l1217.html?v1=2290933",
  "https://www.zara.com/ww/en/woman-tshirts-l1362.html?v1=2290973",
  "https://www.zara.com/ww/en/woman-sweatshirts-l1320.html?v1=2291105",
  "https://www.zara.com/ww/en/woman-trousers-l1335.html?v1=2291147",
  "https://www.zara.com/ww/en/woman-jeans-l1119.html?v1=2291201",
  "https://www.zara.com/ww/en/woman-skirts-l1299.html?v1=2291246",
  "https://www.zara.com/ww/en/woman-bags-l1024.html?v1=2291434",
  "https://www.zara.com/ww/en/woman-lingerie-l4021.html?v1=2291556",
  "https://www.zara.com/ww/en/woman-suits-l1437.html?v1=2291298",
  "https://www.zara.com/ww/en/woman-co-ords-l1061.html?v1=2291296",
  "https://www.zara.com/ww/en/woman-loungewear-l3519.html?v1=2288924",
  "https://www.zara.com/ww/en/woman-basics-l1050.html?v1=2291284",
  "https://www.zara.com/ww/en/woman-party-l4824.html?v1=2290661",
  "https://www.zara.com/ww/en/man-outerwear-l715.html?v1=2299139",
  "https://www.zara.com/ww/en/man-jackets-l640.html?v1=2297897",
  "https://www.zara.com/ww/en/man-outerwear-padded-l722.html?v1=2299501",
  "https://www.zara.com/ww/en/man-leather-l704.html?v1=2298416",
  "https://www.zara.com/ww/en/man-knitwear-l681.html?v1=2298056",
  "https://www.zara.com/ww/en/man-trousers-l838.html?v1=2297931",
  "https://www.zara.com/ww/en/man-jeans-l659.html?v1=2297970",
  "https://www.zara.com/ww/en/man-sweatshirts-l821.html?v1=2298024",
  "https://www.zara.com/ww/en/man-shirts-l737.html?v1=2297813",
  "https://www.zara.com/ww/en/man-overshirts-l3174.html?v1=2299516",
  "https://www.zara.com/ww/en/man-tshirts-l855.html?v1=2297854",
  "https://www.zara.com/ww/en/man-polos-l733.html?v1=2298075",
  "https://www.zara.com/ww/en/man-blazers-l608.html?v1=2298109",
  "https://www.zara.com/ww/en/man-suits-l808.html?v1=2297784",
  "https://www.zara.com/ww/en/man-outerwear-vests-l730.html?v1=2299526",
  "https://www.zara.com/ww/en/man-jogging-l679.html?v1=2299536",
  "https://www.zara.com/ww/en/man-bags-l563.html?v1=2299258",
  "https://www.zara.com/ww/en/man-party-editorial-l5888.html?v1=2298329",
  "https://www.zara.com/ww/en/kids-girl-outerwear-l394.html?v1=2293298",
  "https://www.zara.com/ww/en/kids-girl-padded-l6812.html?v1=2293839",
  "https://www.zara.com/ww/en/kids-girl-dresses-l360.html?v1=2293167",
  "https://www.zara.com/ww/en/kids-girl-jumpsuits-l383.html?v1=2293177",
  "https://www.zara.com/ww/en/kids-girl-tshirts-l450.html?v1=2293195",
  "https://www.zara.com/ww/en/kids-girl-sweatshirts-l430.html",
  "https://www.zara.com/ww/en/kids-girl-knitwear-l385.html?v1=2293280",
  "https://www.zara.com/ww/en/kids-girl-shirts-l401.html?v1=2293223",
  "https://www.zara.com/ww/en/kids-girl-trousers-l439.html?v1=2293261",
  "https://www.zara.com/ww/en/kids-girl-jeans-l378.html?v1=2293247",
  "https://www.zara.com/ww/en/kids-girl-skirts-l425.html?v1=2322650",
  "https://www.zara.com/ww/en/kids-girl-trousers-leggings-l442.html?v1=2293270",
  "https://www.zara.com/ww/en/kids-girl-basics-best-option-l5088.html?v1=2293156",
  "https://www.zara.com/ww/en/kids-girl-looks-l388.html?v1=2293618",
  "https://www.zara.com/ww/en/kids-girl-sporty-l1588.html?v1=2293621",
  "https://www.zara.com/ww/en/kids-boy-outerwear-l231.html?v1=2293433",
  "https://www.zara.com/ww/en/kids-boy-puffer-view-all-l6844.html?v1=2334145",
  "https://www.zara.com/ww/en/kids-boy-sweatshirts-l267.html?v1=2293364",
  "https://www.zara.com/ww/en/kids-boy-tshirts-l286.html?v1=2293349",
  "https://www.zara.com/ww/en/kids-boy-trousers-l274.html?v1=2293421",
  "https://www.zara.com/ww/en/kids-boy-jeans-l218.html?v1=2293404",
  "https://www.zara.com/ww/en/kids-boy-shirts-l239.html?v1=2293379",
  "https://www.zara.com/ww/en/kids-boy-knitwear-l223.html?v1=2294012",
  "https://www.zara.com/ww/en/kids-boy-bermudas-l203.html?v1=2293389",
  "https://www.zara.com/ww/en/kids-boy-suits-l266.html?v1=2293437",
  "https://www.zara.com/ww/en/kids-boy-jogging-l220.html?v1=2294037",
  "https://www.zara.com/ww/en/kids-boy-total-look-packs-l4757.html?v1=2294075",
  "https://www.zara.com/ww/en/kids-boy-basics-best-option-l5539.html?v1=2293331",
  "https://www.zara.com/ww/en/kids-boy-underwear-pijamas-l306.html?v1=2326647",
  "https://www.zara.com/ww/en/kids-babygirl-outerwear-l131.html?v1=2292447",
  "https://www.zara.com/ww/en/kids-babygirl-dresses-l108.html?v1=2292330",
  "https://www.zara.com/ww/en/kids-babygirl-jumpsuits-l120.html?v1=2321641",
  "https://www.zara.com/ww/en/kids-babygirl-tshirts-l162.html?v1=2292352",
  "https://www.zara.com/ww/en/kids-babygirl-sweatshirts-l153.html?v1=2292363",
  "https://www.zara.com/ww/en/kids-babygirl-shirts-l133.html?v1=2292372",
  "https://www.zara.com/ww/en/kids-babygirl-knitwear-l122.html?v1=2292438",
  "https://www.zara.com/ww/en/kids-babygirl-skirts-l1406.html?v1=2292385",
  "https://www.zara.com/ww/en/kids-babygirl-jeans-l115.html?v1=2292401",
  "https://www.zara.com/ww/en/kids-babygirl-trousers-l160.html?v1=2292416",
  "https://www.zara.com/ww/en/kids-babygirl-leggings-l6269.html?v1=2292428",
  "https://www.zara.com/ww/en/kids-babygirl-basics-best-option-l5540.html?v1=2292316",
  "https://www.zara.com/ww/en/kids-babygirl-total-look-l3916.html?v1=2292471",
  "https://www.zara.com/ww/en/kids-babygirl-jogging-l117.html?v1=2292454",
  "https://www.zara.com/ww/en/kids-babyboy-outerwear-l47.html?v1=2293566",
  "https://www.zara.com/ww/en/kids-babyboy-trousers-overalls-l1763.html?v1=2320649",
  "https://www.zara.com/ww/en/kids-babyboy-basics-best-option-l5541.html?v1=2293477",
  "https://www.zara.com/ww/en/kids-newborn-total-look-l3947.html?v1=2295313",
  "https://www.zara.com/ww/en/kids-newborn-outerwear-l507.html?v1=2338146",
  "https://www.zara.com/ww/en/kids-newborn-sacs-l6815.html?v1=2330150",
  "https://www.zara.com/ww/en/kids-newborn-dresses-l488.html?v1=2338652",
  "https://www.zara.com/ww/en/kids-newborn-dungarees-l3096.html?v1=2295332",
  "https://www.zara.com/ww/en/kids-newborn-trousers-l524.html?v1=2295342",
  "https://www.zara.com/ww/en/kids-newborn-leggings-l6816.html?v1=2341455",
  "https://www.zara.com/ww/en/kids-newborn-bottoms-l487.html?v1=2295355",
  "https://www.zara.com/ww/en/kids-newborn-bodysuits-l4208.html?v1=2295348",
];

// Write the URLs to a Terraform variables file or use another method to pass them
const terraformVars = `instance_urls = ${JSON.stringify(urls)}`;
fs.writeFileSync("terraform.tfvars", terraformVars);

// Run Terraform Init and Apply
runTerraformCommand("terraform init");
runTerraformCommand("terraform apply -auto-approve");
