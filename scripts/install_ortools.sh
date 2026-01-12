#!/bin/bash

echo "========================================="
echo "OR-TOOLS KURULUM"
echo "========================================="

# Python versiyonunu kontrol et
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python versiyon: $python_version"

# pip kurulu mu kontrol et
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 bulunamadı. Lütfen Python pip'i kurun."
    exit 1
fi

# OR-Tools kur
echo ""
echo "OR-Tools kuruluyor..."
pip3 install --upgrade pip
pip3 install -r requirements.txt

# Test et
echo ""
echo "========================================="
echo "TEST"
echo "========================================="
python3 scripts/test_ortools.py

echo ""
echo "✅ Kurulum tamamlandı!"
