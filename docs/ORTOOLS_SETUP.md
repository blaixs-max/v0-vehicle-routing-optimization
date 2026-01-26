# OR-Tools Kurulum Rehberi

## Gereksinimler

Python 3.8+ gereklidir.

## Kurulum

### 1. Python Bağımlılıklarını Kur

\`\`\`bash
pip install -r requirements.txt
\`\`\`

Veya manuel olarak:

\`\`\`bash
pip install ortools numpy
\`\`\`

### 2. Test Et

\`\`\`bash
python3 scripts/ortools_optimizer.py
\`\`\`

Test JSON verisi stdin'den gönder:

\`\`\`bash
echo '{"customers": [], "vehicles": [], "depot": {"lat": 41.0, "lng": 28.9}}' | python3 scripts/ortools_optimizer.py
\`\`\`

## Vercel Deploy

Vercel'de Python runtime'ı aktif olmadığı için OR-Tools local/server'da çalıştırılmalı.

### Alternatif 1: Next.js API Route (Child Process)
- Vercel Pro plan gerektirir
- Python runtime custom configuration

### Alternatif 2: Ayrı Python Server
- Python API server (Flask/FastAPI)
- Next.js → Python API → OR-Tools
- Heroku/Railway/DigitalOcean'da host et

### Alternatif 3: v0 Preview'da Test
- v0 Next.js runtime'ı scripts/ortools_optimizer.py'yi destekler
- Local test için yeterli

## Kullanım

\`\`\`typescript
// API çağrısı
const response = await fetch('/api/optimize-ortools', {
  method: 'POST',
  body: JSON.stringify({
    customers, vehicles, depot
  })
})
\`\`\`

## Hata Ayıklama

### "Python not found" hatası
\`\`\`bash
which python3
# Veya
python3 --version
\`\`\`

### "ortools module not found"
\`\`\`bash
pip install --upgrade ortools
python3 -c "import ortools; print(ortools.__version__)"
\`\`\`

### Performance ayarları
`scripts/ortools_optimizer.py` içinde:
\`\`\`python
search_parameters.time_limit.seconds = 30  # Azalt: 10-15 saniye
