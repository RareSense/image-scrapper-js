variable "instance_users" {
  type = list(object({
    email = string
    password = string
  }))
}
variable "project_id" {
  type = string
  default = "vocal-circle-388907"
}
variable "brand" {
  type = string
  default = "pinterest-2"
}
variable "private_key" {
  description = "Private key"
  type        = string
  default     = ""
}

provider "google" {
  credentials = file("google.json")
  project     = var.project_id
  region      = "us-central1"
  zone        = "us-central1-a"
}


resource "google_service_account" "brand_image_uploader" {
  account_id   = "brand-image-uploader"
  display_name = "Service account to upload images from VMs to GCS"
}

resource "google_project_iam_member" "storage_object_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.brand_image_uploader.email}"
}

resource "google_compute_instance" "default" {
  count        = length(var.instance_users)
  name         = "${var.brand}-${count.index}"

  machine_type = "e2-standard-2"
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
    email  = google_service_account.brand_image_uploader.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata = {
    email = element(var.instance_users, count.index).email
    password = element(var.instance_users, count.index).password
    brand = var.brand
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
            git checkout pinterest

            echo "Installing node dependencies"
            npm install
            echo "Running the project"
            node ./index.js

        } &> /var/log/startup-script.log

    EOT
  }
}