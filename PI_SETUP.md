# Raspberry Pi Setup Guide for GitHub Actions Deployment

This guide will help you set up automated deployment from GitHub to your Raspberry Pi using GitHub Actions self-hosted runner and PM2 process manager.

## Understanding the Directory Configuration

**Important:** If you're seeing Git warnings like `/usr/bin/git config --global --add safe.directory /home/alex/projects/dashboard-server/dashboard-server`, this indicates a nested directory issue caused by incorrect runner configuration.

**The Solution:**
- Configure the runner with `--work /home/alex/projects` (not `--work /home/alex/projects/dashboard-server`)
- GitHub Actions will automatically create: `/home/alex/projects/YOUR_USERNAME/dashboard-server`
- This matches your repository structure and prevents nested directories
- The ecosystem.config.js uses relative paths, making it portable across different checkout locations

See Section 12 "Reconfiguring Existing Runner" if you need to fix an existing installation.

## Prerequisites

Before starting, ensure you have:
- ✅ Node.js version 22 (as specified in `.nvmrc`) installed via NVM
- ✅ NVM (Node Version Manager) installed
- ✅ Raspberry Pi running a compatible Linux distribution (Raspbian/Raspberry Pi OS recommended)
- ✅ Repository cloned (will be done by GitHub Actions, but useful for initial setup)
- ✅ PM2 will be configured during this setup

## 1. Verify Current PM2 Setup

Before making changes, check your existing PM2 configuration:

```bash
# Check PM2 status
pm2 list

# View detailed info about the dashboard-server app
pm2 info dashboard-server

# View logs
pm2 logs dashboard-server --lines 50
```

If PM2 is not currently running the app, you can start it manually:

```bash
cd ~/projects/YOUR_USERNAME/dashboard-server
npm run build
pm2 start ecosystem.config.js
pm2 save
```

**Note:** Replace `YOUR_USERNAME` with your actual GitHub username (e.g., `alexdmejias`).

## 2. Ensure PM2 Starts on Boot

To ensure your application automatically restarts after a system reboot:

```bash
# Generate the startup script (run this once)
pm2 startup

# This will output a command to run with sudo - copy and execute it
# Example output: sudo env PATH=$PATH:/home/pi/.nvm/versions/node/v22.x.x/bin ...

# After running the sudo command, save the current PM2 process list
pm2 save
```

**Note:** The startup command needs to be run whenever you upgrade Node.js or change the PM2 installation.

## 3. Install GitHub Actions Runner

### 3.1 Navigate to GitHub Runner Setup Page

1. Go to your GitHub repository
2. Click on **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Select **Linux** and **ARM64** architecture

### 3.2 Download and Configure the Runner

On your Raspberry Pi, create a directory for the runner and download it:

```bash
# Create a directory for the runner
mkdir -p ~/actions-runner
cd ~/actions-runner

# Download the latest runner package (ARM64 for Raspberry Pi)
# Replace X.X.X with the version shown on the GitHub setup page
curl -o actions-runner-linux-arm64-X.X.X.tar.gz -L https://github.com/actions/runner/releases/download/vX.X.X/actions-runner-linux-arm64-X.X.X.tar.gz

# Extract the installer
tar xzf ./actions-runner-linux-arm64-X.X.X.tar.gz
```

### 3.3 Configure the Runner

**CRITICAL:** Configure the runner with a custom work directory to use the existing project directory:

```bash
# Run the configuration script with custom work directory
./config.sh --url https://github.com/YOUR_USERNAME/dashboard-server --token YOUR_TOKEN --work /home/alex/projects

# When prompted:
# - Enter runner name (e.g., "raspberry-pi" or "pi-runner")
# - Accept default runner group (press Enter)
# - Add labels if desired (optional, press Enter to skip)
```

**Important:** 
- Replace `YOUR_USERNAME` with your GitHub username and `YOUR_TOKEN` with the token provided on the GitHub runner setup page.
- The `--work` flag should point to `/home/alex/projects` (not `/home/alex/projects/dashboard-server`)
- GitHub Actions will automatically create subdirectories: `/home/alex/projects/YOUR_USERNAME/dashboard-server`
- This matches the structure expected by your PM2 configuration and avoids nested directory warnings
- This is the single source of truth for your application

### 3.4 Install Runner as a Service

To ensure the runner starts automatically on boot:

```bash
# Install the service (run from ~/actions-runner directory)
sudo ./svc.sh install $USER

# Start the service
sudo ./svc.sh start

# Check service status
sudo ./svc.sh status
```

## 4. Verify GitHub Actions Runner

### 4.1 Check Runner Status on GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **Runners**
3. You should see your runner listed with a green "Idle" status

### 4.2 Check Runner Status on Raspberry Pi

```bash
# Check service status
sudo ./svc.sh status

# View runner logs
cd ~/actions-runner
tail -f _diag/Runner_*.log
```

## 5. Test the Setup

You have two ways to test the deployment:

### Option 1: Push to Main Branch

```bash
# Make a small change to trigger deployment
git checkout main
git pull
echo "# Test deployment" >> README.md
git add README.md
git commit -m "Test GitHub Actions deployment"
git push origin main
```

### Option 2: Manual Trigger via GitHub UI

1. Go to your repository on GitHub
2. Click on **Actions** tab
3. Select **Deploy to Raspberry Pi** workflow
4. Click **Run workflow** button
5. Select the `main` branch
6. Click **Run workflow**

### Watch the Deployment

1. On GitHub Actions tab, you'll see the workflow run appear
2. Click on it to see real-time logs
3. On your Pi, you can monitor with: `pm2 logs dashboard-server`

## 6. Directory Structure

With the correct runner configuration, GitHub Actions creates the following structure:

```
~/projects/                         # Runner work directory (base)
└── YOUR_USERNAME/                  # GitHub username/org
    └── dashboard-server/           # Repository name - Single source of truth
        ├── src/                    # Source code
        ├── dist/                   # Built files
        ├── node_modules/           # Dependencies
        ├── logs/                   # Application logs
        │   ├── err.log
        │   ├── out.log
        │   └── combined.log
        └── ecosystem.config.js     # PM2 configuration

~/actions-runner/                   # Runner software only
├── config.sh
├── run.sh
├── svc.sh
└── _diag/                          # Runner diagnostic logs
```

**How it works:**
- Runner is configured with `--work /home/alex/projects`
- GitHub Actions checks out code into `/home/alex/projects/YOUR_USERNAME/dashboard-server`
- This is the single directory where everything happens
- PM2 runs the app from this directory (using relative paths in ecosystem.config.js)
- Manual deployments (`git pull`) also work from this directory
- No nested directories, no duplicate directories, no confusion

## 7. How It Works

When you push code to GitHub or manually trigger the workflow:

1. **GitHub Actions detects the trigger** (push to main or manual dispatch)
2. **Runner receives the job** and checks out code into `/home/alex/projects/YOUR_USERNAME/dashboard-server`
3. **Dependencies are installed** with `npm ci` in that directory
4. **TypeScript is built** with `npm run build`, creating files in `./dist/`
5. **Tests run** (failures don't stop deployment)
6. **PM2 restarts** the app using `pm2 restart dashboard-server || pm2 start ecosystem.config.js`
7. **Verification** happens by checking PM2 status

**Key Point:** Everything happens in `/home/alex/projects/YOUR_USERNAME/dashboard-server` - the single source of truth. The ecosystem.config.js uses relative paths, making it portable and compatible with the GitHub Actions checkout directory.

## 8. Monitoring

### View PM2 Logs

```bash
# Real-time logs
pm2 logs dashboard-server

# Last 100 lines
pm2 logs dashboard-server --lines 100

# Error logs only
pm2 logs dashboard-server --err

# Clear logs
pm2 flush
```

### View GitHub Actions Runner Logs

```bash
# Runner service logs
sudo journalctl -u actions.runner.* -f

# Runner diagnostic logs
cd ~/actions-runner
tail -f _diag/Runner_*.log

# Worker logs
tail -f _diag/Worker_*.log
```

### Check PM2 Status

```bash
# List all PM2 processes
pm2 list

# Detailed info about dashboard-server
pm2 info dashboard-server

# Monitor in real-time (like top)
pm2 monit
```

## 9. Useful Commands

### Manual Deployment (Alternative to GitHub Actions)

If you need to deploy manually, navigate to the same directory that GitHub Actions uses:

```bash
cd ~/projects/YOUR_USERNAME/dashboard-server
git pull origin main
npm ci
npm run build
pm2 restart dashboard-server
```

**Note:** This is the same directory that GitHub Actions uses, so manual and automated deployments are always in sync.

### PM2 Management

```bash
# Restart the app
pm2 restart dashboard-server

# Stop the app
pm2 stop dashboard-server

# Start the app
pm2 start ecosystem.config.js

# Delete the app from PM2
pm2 delete dashboard-server

# Save current PM2 process list
pm2 save

# Resurrect saved processes
pm2 resurrect

# View environment variables
pm2 env 0
```

### GitHub Actions Runner Management

```bash
cd ~/actions-runner

# Check runner status
sudo ./svc.sh status

# Stop the runner
sudo ./svc.sh stop

# Start the runner
sudo ./svc.sh start

# Restart the runner
sudo ./svc.sh restart

# Uninstall the runner service
sudo ./svc.sh uninstall

# Remove the runner (run after uninstall)
./config.sh remove --token YOUR_TOKEN
```

## 10. Troubleshooting

### Verify Runner Work Directory

Check that your runner is configured to use the correct work directory:

```bash
cd ~/actions-runner
cat .runner  # Should show workFolder pointing to your projects directory
```

The output should contain something like:
```json
{
  "workFolder": "/home/alex/projects"
}
```

When GitHub Actions runs, it will checkout code into `/home/alex/projects/YOUR_USERNAME/dashboard-server`.

### Verify PM2 Working Directory

Check that PM2 is using the correct directory:

```bash
pm2 describe dashboard-server | grep cwd
# Should show the directory where PM2 was started (GitHub Actions checkout directory)
# Example: │ cwd              │ /home/alex/projects/alexdmejias/dashboard-server
```

**Note:** With the updated ecosystem.config.js (no hardcoded cwd), PM2 will use the directory from which the `pm2 start` command was run.

### Problem: `pm2: command not found` in GitHub Actions

**Solution:** Ensure PM2 is installed globally in the Node.js version managed by NVM:

```bash
# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use the correct Node version
nvm use 22

# Install PM2 globally
npm install -g pm2

# Verify installation
which pm2
pm2 --version
```

### Problem: Application Not Starting After Deployment

**Check the following:**

```bash
# 1. Check PM2 logs for errors
pm2 logs dashboard-server --lines 50

# 2. Verify the build output exists
ls -la ~/projects/dashboard-server/dist/

# 3. Check if the app is actually running
pm2 list

# 4. Manually test the built code
cd ~/projects/dashboard-server
node dist/index.js

# 5. Check for missing environment variables
pm2 env 0
```

**Common causes:**
- Missing `.env` file or environment variables
- Build errors (check workflow logs)
- Port already in use
- Missing dependencies

### Problem: Runner Going Offline

**Check runner status:**

```bash
# Check if the service is running
sudo ./svc.sh status

# Check system resources
free -h
df -h

# Restart the runner
cd ~/actions-runner
sudo ./svc.sh restart

# Check logs for errors
tail -f _diag/Runner_*.log
```

**Common causes:**
- Raspberry Pi lost network connection
- Raspberry Pi was rebooted and service didn't start
- Runner process crashed (check logs)
- Disk space full

### Problem: Workflow Fails on Dependency Installation

**Solution:** Clear the npm cache and try again:

```bash
cd ~/projects/dashboard-server
rm -rf node_modules package-lock.json
npm cache clean --force
```

Then trigger the workflow again.

### Problem: Multiple Instances of the App Running

If you have multiple PM2 instances:

```bash
# List all PM2 processes
pm2 list

# Delete all instances
pm2 delete all

# Start fresh from the project directory
cd ~/projects/dashboard-server
pm2 start ecosystem.config.js
pm2 save
```

### Problem: Changes Not Reflected After Deployment

**Check:**
1. Verify the workflow completed successfully on GitHub
2. Check which directory PM2 is using:
   ```bash
   pm2 info dashboard-server | grep cwd
   # Should show the GitHub Actions checkout directory
   # Example: /home/alex/projects/YOUR_USERNAME/dashboard-server
   ```
3. Verify the correct code is deployed:
   ```bash
   cd ~/projects/YOUR_USERNAME/dashboard-server
   git log -1
   ```

## 11. Benefits of This Setup

✅ **Automatic Deployment** - Push to main branch triggers deployment  
✅ **Manual Trigger** - Deploy on-demand via GitHub UI  
✅ **No Port Forwarding** - Pi connects out to GitHub (works behind NAT/firewall)  
✅ **No Static IP Required** - No need for dynamic DNS or port forwarding  
✅ **Correct Directory Structure** - Proper runner configuration prevents nested directories  
✅ **No safe.directory Warnings** - Using `/home/alex/projects` as work directory avoids Git warnings  
✅ **Flexibility** - Manual git pull + pm2 restart still works from the checkout directory  
✅ **Process Management** - PM2 handles restarts and monitoring  
✅ **Logging** - Built-in logging for both GitHub Actions and PM2  
✅ **Portable Configuration** - ecosystem.config.js uses relative paths

## 12. Reconfiguring Existing Runner

If you already set up the runner with the wrong work directory and are experiencing nested directory issues (like the `safe.directory` warning), follow these steps:

```bash
# 1. Stop the runner service
cd ~/actions-runner
sudo ./svc.sh stop

# 2. Uninstall the service
sudo ./svc.sh uninstall

# 3. Remove the runner configuration
./config.sh remove --token YOUR_TOKEN

# 4. Reconfigure with the correct work directory
./config.sh --url https://github.com/YOUR_USERNAME/dashboard-server --token YOUR_NEW_TOKEN --work /home/alex/projects

# 5. Reinstall and start the service
sudo ./svc.sh install $USER
sudo ./svc.sh start

# 6. Verify the configuration
cat .runner  # Should show workFolder: /home/alex/projects
sudo ./svc.sh status

# 7. Restart PM2 to ensure it's using the correct directory
# Navigate to where GitHub Actions will checkout the code
cd ~/projects/YOUR_USERNAME/dashboard-server
pm2 restart dashboard-server || pm2 start ecosystem.config.js
pm2 save
```

**Note:** 
- You'll need a new token from GitHub (Settings → Actions → Runners → Add runner) for the reconfiguration.
- GitHub Actions will checkout code into `/home/alex/projects/YOUR_USERNAME/dashboard-server`
- This eliminates the nested directory issue that causes the `safe.directory` warning

## 13. Security Notes

- The runner has access to your repository code
- The runner runs under your user account on the Raspberry Pi
- Secrets can be configured in GitHub and accessed in workflows
- Keep your Pi's OS and packages up to date
- Consider using SSH keys for additional security

## 14. Updating Node.js Version

If you need to update the Node.js version:

```bash
# Install new version via NVM
nvm install 22  # or whatever version you need

# Update .nvmrc in your repository
cd ~/projects/YOUR_USERNAME/dashboard-server
echo "22" > .nvmrc

# Reinstall PM2 for the new Node version
npm install -g pm2

# Update PM2 startup script
pm2 unstartup
pm2 startup
# Run the sudo command it outputs
pm2 save
```

## Need Help?

- Check GitHub Actions logs: **Repository → Actions → [Workflow Run]**
- Check PM2 logs: `pm2 logs dashboard-server`
- Check runner logs: `cd ~/actions-runner && tail -f _diag/Runner_*.log`
- Verify runner status: **Repository → Settings → Actions → Runners**

---

**Last Updated:** 2026-01-02
