# Vercel Deploy Rehberi - OR-Tools Entegrasyonu

## Gereksinimler

Vercel'de Python API route'lar otomatik çalışır. Yapılması gereken:

### 1. Environment Variables Ekle

Vercel Dashboard > Settings > Environment Variables:
- `ORS_API_KEY` → OpenRouteService API key

### 2. Deploy Et

v0'da **"Publish"** butonuna tıkla veya:
\`\`\`bash
vercel deploy
\`\`\`

### 3. Python Runtime Otomatik Kurulur

`vercel.json` dosyasında Python runtime tanımlı:
\`\`\`json
{
  "functions": {
    "api/optimize_ortools.py": {
      "runtime": "python3.9"
    }
  }
}
\`\`\`

Vercel otomatik olarak:
- Python 3.9 runtime kurar
- `requirements.txt` dosyasından bağımlılıkları yükler
- OR-Tools ve numpy kurar

## Test

Deploy sonrası:
1. `https://your-app.vercel.app` adresine git
2. Optimizasyon sayfasına git
3. "Rotaları Optimize Et" butonuna tıkla
4. OR-Tools algoritması otomatik çalışacak

## Troubleshooting

**OR-Tools çalışmıyorsa:**
- Vercel Logs kontrol et
- Python timeout (30 saniye limit)
- Fallback olarak ORS çalışır

**Memory limit:**
- Vercel Free: 1024 MB
- 256 müşteri için yeterli
- Daha fazla için Pro plan gerekli
