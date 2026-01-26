# Railway OR-Tools Servisi Deployment Rehberi

## Sorun Çözüldü!

**Hata:** `ModuleNotFoundError: No module named 'requests'`

**Çözüm:** `requirements-railway.txt` dosyasına `requests==2.31.0` eklendi.

---

## Railway'e Deployment Adımları

### 1. Railway Projesini Oluştur

1. [Railway.app](https://railway.app)'e git
2. "New Project" → "Deploy from GitHub repo"
3. Bu repository'yi seç
4. Service adını ayarla (örn: "vrp-ortools-optimizer")

### 2. Build Ayarları

Railway otomatik olarak root dizindeki `Dockerfile`'ı bulacak ve kullanacak.

**Varsayılan Ayarlar:**
- Build Command: Docker build (otomatik)
- Start Command: Dockerfile'daki CMD (otomatik)
- Port: 8080 (otomatik detect)

### 3. Environment Variables

Railway dashboard'da şu environment variable'ı ekle:

```
OSRM_URL=http://router.project-osrm.org
```

veya kendi OSRM instance'ınız varsa:

```
OSRM_URL=https://your-osrm-instance.com
```

### 4. Deploy

Railway otomatik olarak deploy edecek. Logs'ta şunları göreceksiniz:

```
All packages installed successfully
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8080
```

### 5. Railway URL'ini Alın

Deploy başarılı olduktan sonra:
1. Railway dashboard'da "Settings" → "Networking"
2. "Generate Domain" butonuna tıklayın
3. URL'i kopyalayın (örn: `https://your-service.railway.app`)

### 6. Vercel'de Environment Variable Ekle

Vercel dashboard'da:
1. Project Settings → Environment Variables
2. Yeni variable ekle:
   - **Name:** `RAILWAY_API_URL`
   - **Value:** `https://your-service.railway.app` (Railway'den aldığınız URL)
   - **Environments:** Production, Preview, Development
3. Save
4. Redeploy edin

---

## Test Etme

### Railway Servisini Test Et

1. Tarayıcıda Railway URL'inizi açın: `https://your-service.railway.app/health`
2. Şunu görmelisiniz: `{"status":"healthy"}`

### Next.js App'ten Test Et

1. Next.js app'inizde `/test-railway` sayfasını açın
2. "Railway Servisini Test Et" butonuna tıklayın
3. Başarılı yanıt almalısınız

### Optimize Sayfasında Test

1. `/optimize` sayfasını açın
2. Algoritma olarak "OR-Tools (Önerilen)" seçin
3. "Optimize Et" butonuna tıklayın
4. Optimizasyon başarıyla çalışmalı

---

## Sorun Giderme

### Deploy Başarısız Olursa

**1. Logs'u Kontrol Edin**
- Railway dashboard → Deployments → Son deployment → View Logs
- Hata mesajlarını okuyun

**2. Build Hatası: Package Not Found**
- `requirements-railway.txt` dosyasında gerekli package var mı?
- Package versiyonu uyumlu mu?

**3. Runtime Hatası: Import Error**
- Dockerfile'da verification step başarılı mı?
- `python -c "import requests; import ortools; import fastapi"` komutu çalışıyor mu?

**4. Port Hatası**
- Railway PORT environment variable'ı otomatik atar
- Dockerfile'daki CMD `PORT` variable'ını kullanıyor mu?

### Servis Yanıt Vermiyorsa

**1. Health Check Test**
```bash
curl https://your-service.railway.app/health
```

Beklenen yanıt:
```json
{"status":"healthy"}
```

**2. Servis Logs'u Kontrol Et**
- Railway dashboard → Logs
- "Uvicorn running" mesajını görüyor musunuz?

**3. Cold Start**
- İlk request sonrası 10-20 saniye bekleyin
- Railway servisleri sleep modundan uyanma süresi gerektirir

**4. OSRM_URL Kontrolü**
```bash
curl http://router.project-osrm.org/route/v1/driving/13.388860,52.517037;13.397634,52.529407?overview=false
```

OSRM çalışıyorsa JSON yanıt alırsınız.

---

## Maliyet Optimizasyonu

Railway free tier:
- $5 ücretsiz kredi/ay
- 500 saat uptime
- 512MB RAM (her servis için)

Öneriler:
- Development ortamında VROOM kullanın (ücretsiz)
- Production'da OR-Tools kullanın
- Railway servisini sadece production için aktif tutun

---

## Alternatif: VROOM Kullanın

Railway setup yapmak istemiyorsanız:

1. Optimize sayfasında "VROOM" algoritmasını seçin
2. Hızlı, ücretsiz, deployment gerektirmez
3. Çoğu use case için yeterli performans

---

## Dosya Yapısı

```
/
├── Dockerfile                  # Railway için
├── requirements-railway.txt    # Python dependencies
├── railway/
│   ├── main.py                # FastAPI app
│   ├── ortools_optimizer.py   # OR-Tools logic
│   ├── Dockerfile             # Alternative (kullanılmıyor)
│   └── requirements.txt       # Alternative (kullanılmıyor)
```

**Not:** Root dizindeki `Dockerfile` ve `requirements-railway.txt` kullanılıyor.

---

## Başarılı Deployment Checklist

- [ ] Railway projesini oluşturdum
- [ ] Deploy logs'ta "All packages installed successfully" gördüm
- [ ] Railway URL'i aldım
- [ ] `https://railway-url/health` test ettim - başarılı
- [ ] Vercel'de RAILWAY_API_URL environment variable'ı ekledim
- [ ] Vercel'i redeploy ettim
- [ ] `/test-railway` sayfasında test ettim - başarılı
- [ ] `/optimize` sayfasında OR-Tools ile optimize ettim - başarılı

---

## Yardım

Hala sorun yaşıyorsanız:

1. Railway logs'u kontrol edin
2. Vercel logs'u kontrol edin
3. `/test-railway` sayfasındaki diagnostics'i çalıştırın
4. `docs/OR-TOOLS-TROUBLESHOOTING.md` dosyasını okuyun
