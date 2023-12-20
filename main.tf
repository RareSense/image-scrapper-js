provider "google" {
  credentials = file("google.json")
  project     = "vocal-circle-388907"
  region      = "us-central1"
  zone        = "us-central1-a"
}

variable "instance_urls" {
  type = list(string)
}

resource "google_compute_instance" "default" {
  count        = length(var.instance_urls)
  name         = "instance-${count.index}"

  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "scrapper-image"
    }
  }

  network_interface {
    network = "default"
    access_config {
      // Ephemeral public IP
    }
  }

  metadata = {
    url = element(var.instance_urls, count.index)
  }

  metadata_startup_script = <<-EOT
    #!/bin/bash
    sudo apt-get update
    
    // Install Nodejs
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    node --version
    npm --version

    // Install Google Chrome
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    sudo apt install -y ./google-chrome-stable_current_amd64.deb
    
    git clone git@github.com:RareSense/image-scrapper-js.git
    cd image-scrapper-js
    git fetch origin
    git checkout stardivarius

    npm install
    node app.js

    // Add other commands as needed
  EOT
}