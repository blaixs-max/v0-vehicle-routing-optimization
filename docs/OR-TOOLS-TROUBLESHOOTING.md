# OR-Tools Sorun Giderme Rehberi

## Yaygın Hatalar ve Çözümleri

### 1. "Railway API URL not configured" Hatası

**Neden:** `RAILWAY_API_URL` environment variable tanımlanmamış.

**Çözüm:**
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Yeni variable ekle:
   - Key: `RAILWAY_API_URL`
   - Value: Railway servisinizin URL'si (örn: `https://your-service.railway.app`)
3. Tüm environment'lara (Production, Preview, Development) ekle
4. Uygulamayı redeploy et

### 2. "Railway servisi yanıt vermiyor (502/503)" Hatası

**Olası Nedenler:**
- Railway servisi çalışmıyor
- Railway servisi cold start yaşıyor
- RAILWAY_API_URL yanlış

**Çözümler:**

#### a) Railway Servisini Kontrol Edin
1. Railway Dashboard'a giriş yapın
2. Servisinizin "Active" olduğundan emin olun
3. Logs'u kontrol edin - hata var mı?

#### b) Railway Servisini Test Edin
1. Tarayıcınızda `https://your-railway-service.railway.app/health` adresini açın
2. Şu yanıtı almalısınız: `{"status": "healthy"}`
3. Eğer "503 Service Unavailable" görüyorsanız:
   - Railway servisi sleep mode'da olabilir
   - 30 saniye bekleyin ve tekrar deneyin
   - Railway'de "Always On" özelliğini aktif edin (Hobby plan gerekir)

#### c) RAILWAY_API_URL'yi Doğrulayın
Doğru format:
- ✅ `https://your-service.railway.app`
- ❌ `https://your-service.railway.app/` (sondaki slash olmadan)
- ❌ `http://...` (https kullanın)

### 3. "Insufficient capacity" Hatası

**Neden:** Toplam araç kapasitesi, toplam siparişlerden az.

**Çözüm:**
1. Daha fazla araç ekleyin
2. Veya bazı siparişleri/müşterileri kaldırın
3. Araç kapasitelerini artırın (Vehicles sayfasından)

### 4. "Koordinatları olan müşteri bulunamadı" Hatası

**Neden:** Müşterilerin lat/lng koordinatları eksik veya 0.

**Çözüm:**
1. Customers sayfasına gidin
2. Her müşterinin koordinatlarını kontrol edin
3. Eksik koordinatları düzeltin
4. "Missing Coordinates" uyarısı varsa düzeltin

### 5. "Bekleyen siparişi olan müşteri bulunamadı" Hatası

**Neden:** Optimize etmek için seçilen müşterilerin hiçbirinin pending/in_transit siparişi yok.

**Çözüm:**
1. Orders sayfasına gidin
2. En az bir "Pending" veya "In Transit" siparişi olduğundan emin olun
3. Veya yeni sipariş oluşturun

## Test Araçları

### Railway Servis Testi

Tarayıcınızda şu adrese gidin:
```
https://your-vercel-app.vercel.app/test-railway
```

Bu sayfa:
- ✅ Railway servisi çalışıyor mu kontrol eder
- ✅ RAILWAY_API_URL doğru mu kontrol eder  
- ✅ Health check yapar
- ✅ Detaylı hata mesajları gösterir

### Manuel API Testi

Terminal'den test:
```bash
# Health check
curl https://your-railway-service.railway.app/health

# Optimize endpoint testi (basit)
curl -X POST https://your-railway-service.railway.app/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "customers": [],
    "vehicles": [],
    "depots": [],
    "fuel_price": 47.5
  }'
```

## Alternatif: VROOM Kullanın

Eğer OR-Tools sorunlarını çözemiyorsanız, VROOM algoritmasını kullanabilirsiniz:

**Avantajlar:**
- ❌ Railway servisi gerektirmez
- ✅ Tamamen Vercel'de çalışır
- ✅ Hızlı ve kolay

**Kullanım:**
1. Optimize sayfasına gidin
2. Algorithm dropdown'dan "VROOM" seçin
3. Optimize butonuna tıklayın

VROOM, ORS (OpenRouteService) API kullanır ve production-ready bir çözümdür.

## Environment Variables Listesi

Tam liste:
```env
# Gerekli
DATABASE_URL=postgresql://...
ORS_API_KEY=your-ors-api-key

# OR-Tools için gerekli
RAILWAY_API_URL=https://your-service.railway.app

# Opsiyonel
OSRM_URL=https://router.project-osrm.org
```

## Railway Deploy Talimatları

1. Railway hesabı oluşturun: https://railway.app
2. New Project → Deploy from GitHub
3. Repository: Bu projenin GitHub URL'si
4. Root Directory: `/railway`
5. Deploy komutunu çalıştır

Railway `railway.json` ve `railway.toml` dosyalarını otomatik algılar.

## Destek

Hala sorun yaşıyorsanız:
1. `/test-railway` sayfasındaki hata mesajını kopyalayın
2. Railway logs'u kontrol edin
3. Vercel deployment logs'u kontrol edin
4. Browser console'u açın (F12) ve hataları kontrol edin
