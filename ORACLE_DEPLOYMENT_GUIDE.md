# Complete Deployment Guide: Vercel (Frontend) + Oracle Cloud (Backend & OCI Storage)

This guide provides an end-to-end walkthrough for deploying **Fyndr** without Docker using:
- **Frontend:** Vercel (connected directly to the GitHub repository)
- **Backend (API & ML):** Oracle Cloud Always Free Compute VM (Native Node 20 + Python venv + MongoDB 8.0 + PM2)
- **File Storage:** Oracle Cloud Infrastructure (OCI) Object Storage via S3-Compatible API

---

## Architecture Overview

```
[ Guest / Photographer Browser ]
           │
           ├── (1) https://fyndr-web.vercel.app (React Frontend on Vercel)
           │
           ├── (2) Direct Upload / Download (Presigned S3 URLs)
           │         │
           │         ▼
           │   [ OCI Object Storage Bucket: fyndr-photos ]
           │
           ▼
[ Oracle Cloud Always Free VM (Ubuntu 22.04 / Oracle Linux) ]
 ├── Nginx Reverse Proxy (Port 80 / 443 + SSL)
 │     │
 │     ├── /api/ -> Node.js Express API (Port 5000) [Managed via PM2]
 │     └── /ml/  -> Python Flask ML Service (Port 5001) [Managed via PM2]
 ├── Native MongoDB 8.0 (Port 27017) [Managed via systemd]
 └── Local FAISS Storage (/tmp/fyndr_faiss)
```

---

## Part 1: OCI Object Storage Setup & Key Generation

OCI Object Storage offers an Amazon S3-compatible API. Fyndr uses `@aws-sdk/client-s3` to interact with OCI buckets.

### Step 1.1: Retrieve Your Object Storage Namespace
1. Log in to the [Oracle Cloud Console](https://cloud.oracle.com/).
2. In the top-right corner, click your **Profile Icon** &rarr; **Tenancy: `<your-tenancy-name>`**.
3. Under **Tenancy Information**, copy the **Object Storage Namespace** (a string such as `ax9k1pq8z`).
4. Note your **Region Identifier** (e.g., `us-ashburn-1`, `ap-mumbai-1`, `eu-frankfurt-1`).

---

### Step 1.2: Create an Object Storage Bucket
1. Open the navigation menu &rarr; **Storage** &rarr; **Object Storage & Archive Storage** &rarr; **Buckets**.
2. Select your **Compartment** (root or project compartment).
3. Click **Create Bucket**:
   - **Bucket Name:** `fyndr-photos`
   - **Default Storage Tier:** `Standard`
   - **Object Versioning:** Disabled (for free-tier storage optimization)
   - **Encryption:** `Encrypt using Oracle-managed keys`
4. Click **Create**.
5. Under bucket details, set **Visibility** to `Public` if you want direct image URLs, or leave it `Private` for presigned URL access.

---

### Step 1.3: Generate Customer Secret Keys (S3 Access & Secret Keys)
1. In the top-right corner, click your **Profile Icon** &rarr; **User Settings** (or click your username).
2. On the left sidebar under **Resources**, click **Customer Secret Keys**.
3. Click **Generate Secret Key**:
   - **Name:** `fyndr-s3-key`
   - Click **Generate Secret Key**.
4. **Copy the generated Secret Key immediately** and store it safely (Oracle will not display this secret key again).
5. In the Customer Secret Keys table, copy the corresponding **Access Key**.

---

### Step 1.4: Formulate Your Storage Environment Variables

```env
# OCI Object Storage (S3-Compatible)
R2_ENDPOINT=https://<your_namespace>.compat.objectstorage.<your_region>.oraclecloud.com
R2_ACCESS_KEY=<your_customer_access_key>
R2_SECRET_KEY=<your_customer_secret_key>
R2_BUCKET=fyndr-photos
R2_REGION=<your_region>
```

*Example for Ashburn:*
`R2_ENDPOINT=https://ax9k1pq8z.compat.objectstorage.us-ashburn-1.oraclecloud.com`

---

## Part 2: Oracle Cloud VM Setup (Non-Docker Native Setup)

### Step 2.1: Provision the Free Compute Instance
1. Go to **Compute** &rarr; **Instances** &rarr; **Create Instance**.
2. **Image:** Ubuntu 22.04 LTS or Oracle Linux 9 (x86_64 or Ampere A1 ARM 4 OCPU / 24GB RAM).
3. **Networking:** Assign a Public IPv4 address.
4. **SSH Keys:** Save the private key (`fyndr_oracle.key`) to your local machine (`~/.ssh/fyndr_oracle.key`).
5. Click **Create** and note the assigned **Public IP** (e.g., `129.151.47.214`).

---

### Step 2.2: Open Ingress Ports in Oracle Cloud Security List
1. In your Instance details, click the **Subnet** under Primary VNIC.
2. Click **Default Security List for...**.
3. Click **Add Ingress Rules**:
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** `TCP`
   - **Destination Port Range:** `80, 443, 5000, 5001`
4. Click **Add Ingress Rules**.

---

### Step 2.3: SSH into the Server & Install System Dependencies
From your local terminal:
```bash
chmod 600 ~/.ssh/fyndr_oracle.key
ssh -i ~/.ssh/fyndr_oracle.key ubuntu@<YOUR_PUBLIC_IP>
```

Update system packages and install base dependencies:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential python3 python3-pip python3-venv nginx certbot python3-certbot-nginx libgl1 libglib2.0-0
```

---

### Step 2.4: Install Node.js 20 & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

---

### Step 2.5: Install & Start Native MongoDB 8.0
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod

# Verify MongoDB is running:
mongosh --eval "db.adminCommand('ping')" # Should output { ok: 1 }
```

---

### Step 2.6: Configure Firewall on the VM (UFW)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw allow 5001/tcp
sudo ufw --force enable
```

---

## Part 3: Deploy Backend & ML Services

### Step 3.1: Clone the Repository
```bash
cd /home/ubuntu
git clone https://github.com/shivbera18/Fyndr.git app
cd /home/ubuntu/app
```

---

### Step 3.2: Set Up Node.js Backend (`node-server-1`)
```bash
cd /home/ubuntu/app/node-server-1
npm install --production
```

Create `/home/ubuntu/app/node-server-1/.env`:
```bash
nano .env
```

Paste your production environment variables:
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb://127.0.0.1:27017/photo_sharing_db
JWT_SECRET=your_super_strong_random_jwt_secret_here
FLASK_URL=http://127.0.0.1:5001
CORS_ORIGIN=*

# Email credentials (for account verification)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Oracle Object Storage (S3-Compatible)
R2_ENDPOINT=https://<your_namespace>.compat.objectstorage.<your_region>.oraclecloud.com
R2_ACCESS_KEY=<your_customer_access_key>
R2_SECRET_KEY=<your_customer_secret_key>
R2_BUCKET=fyndr-photos
R2_REGION=<your_region>
```

---

### Step 3.3: Set Up Python ML Service (`flask-server-2`)
```bash
cd /home/ubuntu/app/flask-server-2
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Create `/home/ubuntu/app/flask-server-2/.env`:
```env
MONGO_URI=mongodb://127.0.0.1:27017/photo_sharing_db
FAISS_BASE=/tmp/fyndr_faiss
PORT=5001
```

Test ML server warmup (press Ctrl+C once loaded):
```bash
python app.py
```

---

### Step 3.4: Configure PM2 for Process Management
Create or update `/home/ubuntu/app/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'fyndr-api',
      cwd: '/home/ubuntu/app/node-server-1',
      script: 'index.js',
      env: {
        NODE_ENV: 'production',
      },
      restart_delay: 3000,
      max_memory_restart: '1G',
    },
    {
      name: 'fyndr-ml',
      cwd: '/home/ubuntu/app/flask-server-2',
      script: '/home/ubuntu/app/flask-server-2/venv/bin/python',
      args: 'app.py',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      restart_delay: 3000,
      max_memory_restart: '3G',
    },
  ],
};
```

Start and persist PM2 processes across reboots:
```bash
cd /home/ubuntu/app
pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Check process status:
```bash
pm2 status
```

---

### Step 3.5: Configure Nginx (Reverse Proxy & HTTPS)

Create `/etc/nginx/sites-available/fyndr`:
```bash
sudo nano /etc/nginx/sites-available/fyndr
```

Add configuration:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com; # Or your server's Public IP

    client_max_body_size 100M;

    # Node.js API Proxy
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and test Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/fyndr /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

*(Optional with a domain)* Set up free SSL with Let's Encrypt:
```bash
sudo certbot --nginx -d api.yourdomain.com
```

---

## Part 4: Frontend Deployment on Vercel

### Step 4.1: Connect GitHub to Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** &rarr; **Project**.
3. Import your `shivbera18/Fyndr` GitHub repository.

---

### Step 4.2: Configure Project Settings in Vercel
1. **Framework Preset:** `Create React App` (or `Other`).
2. **Root Directory:** Click **Edit** and choose **`front-end`**.
3. **Build Command:** `npm run build`
4. **Output Directory:** `build`
5. **Install Command:** `npm install`

---

### Step 4.3: Configure Vercel Environment Variables
Under **Environment Variables**, add:

| Variable | Value | Purpose |
|---|---|---|
| `REACT_APP_API_URL` | `https://api.yourdomain.com` *(or `http://<ORACLE_IP>:5000`)* | Oracle Cloud Backend API URL |
| `REACT_APP_ML_URL` | `http://<ORACLE_IP>:5001` | Optional direct ML endpoint |

Click **Deploy**.

---

## Part 5: Verification & Production Smoke Testing

1. **Verify Backend Health:**
   ```bash
   curl http://<ORACLE_IP>:5000/metrics
   ```
2. **Verify ML Endpoint:**
   ```bash
   curl http://<ORACLE_IP>:5001/faiss_stats?event_id=test
   ```
3. **Verify Vercel Web App:**
   - Open your Vercel deployment URL (e.g. `https://fyndr-web.vercel.app`).
   - Register/Sign in as a photographer.
   - Create an event, upload test photos, and verify they appear in your OCI Object Storage bucket.
   - Scan the event QR code with a mobile device, take a selfie, and verify instant facial matching.
