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
let keywords = [
  "fashion editorial",
  "fashion editorial photography vogue",
  "fashion editorial photography creative",
  "street fashion editorial",
  "fashion photography editorial",
  "outdoor fashion photography editorial",
  "black and white fashion photography editorial",
  "street fashion editorial men",
  "solo photography",
  "exotic fashion photography",
  "indian solo fashion photography",
  "pakistani solo fashion photography",
  "arab solo fashion photography",
  "Vogue Arabia",
  "hadid photography",
  "Malhotra Photography",
  "turkish solo fashion photography",
  "african solo fashion photography",
  "african solo fashion editorial",
  "men solo fashion editorial",
  "girls solo fashion editorial",
  "alkaram fashion editorial",
  "parada fashion editorial",
  "arab fashion editorial",
  "sabyasahi fashion editorial",
  "botanica fashion photography",
  "vintage fahsion shoot",
  "ethnic fahsion shoot",
  "limelight fahsion shoot",
  "90s fahsion shoot",
  "almas fahsion shoot",
  "chinese fahsion shoot",
  "layla motta photography",
  "Azeem Sani fashion photography",
  "Tapu Javeri fashion photography",
  "fashion campaign editorial",
  "creative photoshoot",
  "artsy photoshoots",
  "different photoshoot ideas",
  "original photoshoot ideas",
  "travel photoshoot ideas",
  "classy photography",
  "retro photography vintage",
  "self pictures",
  "Kyle thompson",
  "rodney smith",
  "tyler mitchell photography",
  "corinne day",
  "brp port",
  "miles aldridge",
  "harley weir",
  "tyrone lebon",
  "terry richardson",
  "leslie zhang",
  "pakistani fashion aesthetic photoshoot",
  "mous lamrabat",
  "marokko fashion photography",
  "modest fashion editorial",
  "art photography",
  "fine art fashion photography",
];

// Write the URLs to a Terraform variables file or use another method to pass them
const terraformVars = `instance_keywords = ${JSON.stringify(keywords)}`;
fs.writeFileSync("terraform.tfvars", terraformVars);

// Run Terraform Init and Apply
runTerraformCommand("terraform init");
runTerraformCommand("terraform apply -auto-approve");
