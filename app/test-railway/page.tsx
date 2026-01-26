"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react"

export default function TestRailwayPage() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testRailway = async () => {
    setTesting(true)
    setResult(null)

    try {
      const response = await fetch("/api/test-railway")
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || "Test başarısız",
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Railway OR-Tools Test</h1>
        <p className="text-muted-foreground">
          Bu sayfa Railway OR-Tools servisinin çalışıp çalışmadığını test eder.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Servis Testi</CardTitle>
          <CardDescription>
            Railway OR-Tools API&apos;sine bağlantıyı test edin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testRailway} disabled={testing} className="w-full">
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test Ediliyor...
              </>
            ) : (
              "Railway Servisini Test Et"
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Test Başarılı
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Test Başarısız
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.success ? (
              <>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Railway OR-Tools servisi düzgün çalışıyor! Optimize işlemlerini kullanabilirsiniz.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <div>
                    <span className="font-semibold">Railway URL:</span>
                    <code className="ml-2 text-sm bg-muted px-2 py-1 rounded">
                      {result.railwayUrl}
                    </code>
                  </div>

                  {result.healthCheck && (
                    <div>
                      <span className="font-semibold">Health Check:</span>
                      <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto">
                        {JSON.stringify(result.healthCheck, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.rootEndpoint && (
                    <div>
                      <span className="font-semibold">Root Endpoint:</span>
                      <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto">
                        {JSON.stringify(result.rootEndpoint, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Railway servisi yanıt vermiyor</div>
                    <div className="text-sm">{result.error}</div>
                  </AlertDescription>
                </Alert>

                {result.railwayUrl && (
                  <div>
                    <span className="font-semibold">Yapılandırılmış Railway URL:</span>
                    <code className="ml-2 text-sm bg-muted px-2 py-1 rounded">
                      {result.railwayUrl}
                    </code>
                  </div>
                )}

                {result.help && (
                  <div>
                    <div className="font-semibold mb-2">Çözüm Önerileri:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {result.help.map((item: string, index: number) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="font-semibold mb-2">Environment Variables Kontrolü:</div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">RAILWAY_API_URL:</span>
                      <span className={`ml-2 ${result.railwayUrl ? 'text-green-600' : 'text-red-600'}`}>
                        {result.railwayUrl ? '✓ Ayarlanmış' : '✗ Eksik'}
                      </span>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <div className="font-semibold mb-2">Alternatif Çözüm:</div>
                    <div className="text-sm">
                      Eğer Railway servisini ayarlayamıyorsanız, optimize sayfasında 
                      <strong className="mx-1">VROOM</strong> algoritmasını seçerek 
                      optimizasyon yapabilirsiniz. VROOM algoritması Railway servisi gerektirmez.
                    </div>
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Kurulum Talimatları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">1. Railway Projesi Deploy Edin</h3>
            <p className="text-muted-foreground">
              railway/ klasöründeki Python OR-Tools servisini Railway&apos;e deploy edin.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Railway URL&apos;yi Alın</h3>
            <p className="text-muted-foreground">
              Railway dashboard&apos;unuzdan servisinizin public URL&apos;sini kopyalayın.
              Örnek: https://your-service.railway.app
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Environment Variable Ekleyin</h3>
            <p className="text-muted-foreground">
              Vercel Dashboard → Settings → Environment Variables → RAILWAY_API_URL
              <br />
              Değer: Railway servisinizin URL&apos;si (https ile başlamalı)
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Uygulamayı Yeniden Deploy Edin</h3>
            <p className="text-muted-foreground">
              Environment variable eklendikten sonra uygulamayı yeniden deploy edin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
