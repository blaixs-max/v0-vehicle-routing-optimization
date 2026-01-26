# OR-Tools VRP Optimizer - Railway Deployment

## Railway'e Deploy

### 1. Railway Hesabı Oluştur
- https://railway.app adresine git
- GitHub ile giriş yap

### 2. Yeni Proje Oluştur
- "New Project" > "Deploy from GitHub repo"
- Bu repository'yi seç
- Root Directory: `/railway` olarak ayarla

### 3. Environment Variables (Gerekli Değil)
Railway otomatik PORT atayacak

### 4. Deploy
- Railway otomatik build edip deploy eder
- Domain URL'i kopyala (örn: `https://vrp-optimizer-production.up.railway.app`)

## Test

\`\`\`bash
curl https://YOUR-RAILWAY-URL.railway.app/health
\`\`\`

Sonuç:
\`\`\`json
{"status": "healthy"}
\`\`\`

## Vercel Entegrasyonu

Railway URL'ini Vercel environment variable olarak ekle:
\`\`\`
RAILWAY_API_URL=https://YOUR-RAILWAY-URL.railway.app
