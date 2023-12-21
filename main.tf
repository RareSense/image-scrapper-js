provider "google" {
  credentials = file("google.json")
  project     = "vocal-circle-388907"
  region      = "us-central1"
  zone        = "us-central1-a"
}

variable "instance_urls" {
  type = list(string)
}
variable "private_key" {
  description = "Private key"
  type        = string
  default     = ""
}


resource "google_compute_instance" "default" {
  count        = length(var.instance_urls)
  name         = "star-${count.index}"

  machine_type = "e2-standard-4"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "ubuntu-2204-lts"
    }
  }

  network_interface {
    network = "default"
    access_config {
      // Ephemeral public IP
    }
  }

  service_account {
    email  = google_service_account.my_service_account.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata = {
    url = element(var.instance_urls, count.index)
    brand = "stradivarius"
    startup-script = <<-EOT
        #!/bin/bash
        {
            echo "Updating packages"
            sudo apt-get update

            # Install Nodejs
            echo "Installing Nodejs"
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt install -y nodejs
            node --version
            npm --version

            # Install Google Chrome
            echo "Installing google chrome"
            sudo apt-get update
            wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
            sudo apt install -y ./google-chrome-stable_current_amd64.deb

            echo "Adding Private Key"
            PRIVATE_KEY = var.private_key
            eval "$(ssh-agent -s)"
            echo "$PRIVATE_KEY" | ssh-add -

            echo "Cloning repo"
            git clone https://github.com/RareSense/image-scrapper-js.git
            cd image-scrapper-js
            git fetch origin
            git checkout stardivarius

            echo "Installing node dependencies"
            npm install
            echo "Running the project"
            node ./index.js

        } &> /var/log/startup-script.log

    EOT
  }
}