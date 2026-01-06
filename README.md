# EasyStaff Bot - Claw Cloud Deployment

## 📦 Files

- `bot_api_server.js` - Main bot
- `package.json` - Dependencies
- `package-lock.json` - Lock file
- `Dockerfile` - Docker configuration
- `.dockerignore` - Docker ignore rules

## 🚀 Deploy to Claw Cloud

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "EasyStaff bot"
git remote add origin https://github.com/YOUR_USERNAME/easystaff-bot.git
git branch -M main
git push -u origin main
```

### 2. Deploy in Claw Cloud

1. Go to: https://run.claw.cloud/
2. Click "Deploy from GitHub"
3. Connect GitHub
4. Select repository
5. Set port: `3000`
6. Deploy!

### 3. Update WHMCS

Update Bot Server URL to your Claw Cloud URL:
```
https://easystaff-bot-xxxxx.run.claw.cloud
```

---

**Bot URL:** Will be provided after deployment  
**Port:** 3000  
**Health Check:** `/health`
