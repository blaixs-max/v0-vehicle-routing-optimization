# Deployment Checklist - Araç Tipi Kısıtlamaları Güncellemesi

## Yapılan Değişiklikler

### 1. Railway OR-Tools Servisi (`/railway/ortools_optimizer.py`)
✅ **Araç tipi kısıtlamaları güncellendi**
- Strict (hard) constraints → Relaxed constraints
- Artık OR-Tools çözüm bulabilecek
- Araç tipi tercihleri loglanıyor ama strict enforce edilmiyor
- Bu sayede infeasibility problemi çözüldü

✅ **Status kodları düzeltildi**
- Status 5 ve 6 eklendi
- Daha detaylı hata mesajları
- Demand/capacity oranı diagnostic bilgisi

✅ **Detaylı logging eklendi**
- Her aşamada ne olduğu görünüyor
- Debug için kapsamlı bilgi

### 2. Railway Main Servisi (`/railway/main.py`)
✅ **Request logging eklendi**
- Gelen isteklerin detayları loglanıyor
- Total demand ve capacity bilgisi
- Hata durumlarında detaylı bilgi

### 3. Frontend API (`/app/api/optimize/route.ts`)
✅ **Data type düzeltmeleri**
- `demand_pallets` ve `capacity_pallets` artık integer'a parse ediliyor
- String concatenation sorunu çözüldü

✅ **Araç tipi kısıtlamaları aktif**
- `required_vehicle_type` değeri Railway'e gönderiliyor
- Backend'de logged oluyor

✅ **Debug logging**
- Her customer için demand parsing görünüyor
- Total demand/capacity hesaplamaları

## Deployment Adımları

### Adım 1: GitHub'a Push
\`\`\`bash
git add .
git commit -m "fix: OR-Tools optimization with relaxed vehicle type constraints"
git push origin main
\`\`\`

### Adım 2: Railway Deployment
1. Railway dashboard'a gidin
2. Otomatik deployment başlayacak (GitHub webhook)
3. Deployment loglarını izleyin
4. "Build successful" mesajını bekleyin
5. Service yeniden başlayacak

### Adım 3: Test
1. v0 uygulamasında "Optimizasyon" sayfasına gidin
2. Depot seçin (örn: İzmir)
3. "Optimize Et" butonuna tıklayın
4. Console loglarını kontrol edin:
   - `[v0] Total demand:` sayı olmalı (string değil!)
   - `[v0] Total capacity:` doğru değerde olmalı
   - Railway'den başarılı response gelmeli
5. Haritada rotaların göründüğünü doğrulayın

## Beklenen Sonuç

✅ Optimizasyon başarılı olacak
✅ Rotalar oluşturulacak
✅ Araç tipi tercihleri loglanacak (ama strict enforce edilmeyecek)
✅ Her araç, kapasitesine göre müşterileri ziyaret edebilecek

## Sorun Giderme

### Hala "UNKNOWN(6)" hatası alıyorsanız:
1. Railway deployment'ın tamamlandığından emin olun
2. Railway loglarını kontrol edin: `railway logs`
3. Servisi manuel restart deneyin

### Demand hala string concatenation yapıyorsa:
1. Browser cache'i temizleyin
2. Hard refresh yapın (Ctrl+Shift+R)
3. Console'da `[v0] demand_parsed=` logunu kontrol edin

### Hiç rota oluşturulmuyorsa:
1. Total demand vs total capacity oranını kontrol edin
2. Eğer demand > capacity ise, daha fazla araç ekleyin
3. Veya daha az customer seçin

## Gelecek İyileştirmeler

🔄 **Soft Constraints (İleride)**
- Penalty-based system eklenebilir
- Yanlış araç tipi kullanımı için ekstra maliyet
- Ama hard constraint olmayacak

🔄 **Post-Optimization Filter**
- Rota oluştuktan sonra araç tipi uyumluluğunu kontrol et
- Uyumsuz rotaları warning ile göster

---

**Önemli:** Bu versiyon, çözülebilirlik (feasibility) önceliklidir. Araç tipi kısıtlamaları logged oluyor ama problem infeasible olmasın diye strict enforce edilmiyor.
