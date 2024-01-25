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
let users = [
  // {
  // email: "cohaw23635@konican.com",
  // password: "cohaw23635@konican.com1"
  // }
  {
    email: "yaknugokku@gufum.com",
    password: "yasir12"
  },
  {
    email: "tecehu@tutapp.bid",
    password: "yasir12"
  },
  {
    email: "zuqafi@pelaguins.net",
    password: "yasir12"
  },
  {
    email: "hasexiwa@tutapp.bid",
    password: "yasir12"
  }
];

// Write the URLs to a Terraform variables file or use another method to pass them
const terraformVars = `instance_users = ${JSON.stringify(users)}`;
fs.writeFileSync("terraform.tfvars", terraformVars);

// Run Terraform Init and Apply
runTerraformCommand("terraform init");
runTerraformCommand("terraform apply -auto-approve");
