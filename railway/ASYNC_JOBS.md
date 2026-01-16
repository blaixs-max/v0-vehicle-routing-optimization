# Async Job Queue - OR-Tools Optimizer

OR-Tools optimizer için async job queue implementasyonu. Uzun süren optimizasyonlar background'da çalışır.

## 🎯 Özellikler

- ✅ Non-blocking API - İstek hemen döner, job ID alınır
- ✅ Job status tracking - Pending, Running, Completed, Failed
- ✅ Progress monitoring - 0-100% progress
- ✅ Background worker thread - Automatic job processing
- ✅ Job cancellation - Pending jobs iptal edilebilir
- ✅ Auto cleanup - Eski tamamlanmış joblar otomatik silinir
- ✅ Queue statistics - Active job sayısı ve durum

## 📡 API Endpoints

### 1. Submit Async Job

**Endpoint:** `POST /optimize/async`

Optimization request submit edilir, hemen job_id döner.

**Request Body:** `OptimizeRequest` (same as `/optimize`)

**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Job submitted successfully. Use GET /jobs/{job_id} to check status."
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/optimize/async \
  -H "Content-Type: application/json" \
  -d '{
    "depots": [...],
    "customers": [...],
    "vehicles": [...],
    "fuel_price": 47.5,
    "time_limit_seconds": 60
  }'
```

### 2. Get Job Status

**Endpoint:** `GET /jobs/{job_id}`

Job'ın durumunu ve sonucunu sorgular.

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",  // pending | running | completed | failed | cancelled
  "progress": 100,
  "created_at": 1705401234.56,
  "started_at": 1705401235.12,
  "completed_at": 1705401239.84,
  "elapsed_seconds": 4.72,
  "result": {
    "routes": [...],
    "summary": {...}
  },
  "error": null
}
```

**Status Values:**
- `pending` - Job queued, not started yet
- `running` - Job currently processing
- `completed` - Job finished successfully (result available)
- `failed` - Job failed with error (error message available)
- `cancelled` - Job cancelled by user

**Example:**
```bash
curl http://localhost:8000/jobs/550e8400-e29b-41d4-a716-446655440000
```

### 3. Cancel Job

**Endpoint:** `DELETE /jobs/{job_id}`

Pending job'ı iptal eder. Running veya completed jobs iptal edilemez.

**Response:**
```json
{
  "message": "Job 550e8400-e29b-41d4-a716-446655440000 cancelled successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:8000/jobs/550e8400-e29b-41d4-a716-446655440000
```

### 4. Queue Statistics

**Endpoint:** `GET /jobs`

Job queue istatistiklerini döner.

**Response:**
```json
{
  "total_jobs": 15,
  "pending": 3,
  "running": 1,
  "completed": 9,
  "failed": 2,
  "cancelled": 0,
  "queue_size": 3
}
```

**Example:**
```bash
curl http://localhost:8000/jobs
```

## 💡 Usage Examples

### Frontend Integration

```typescript
// 1. Submit async job
async function optimizeAsync() {
  const response = await fetch('/optimize/async', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(optimizationRequest)
  })

  const {job_id} = await response.json()

  // 2. Poll for status
  const pollStatus = setInterval(async () => {
    const statusResponse = await fetch(`/jobs/${job_id}`)
    const status = await statusResponse.json()

    console.log(`Progress: ${status.progress}%`)

    if (status.status === 'completed') {
      clearInterval(pollStatus)
      console.log('Result:', status.result)
      displayRoutes(status.result.routes)
    } else if (status.status === 'failed') {
      clearInterval(pollStatus)
      console.error('Error:', status.error)
    }
  }, 2000)  // Poll every 2 seconds
}
```

### Python Client

```python
import requests
import time

# Submit job
response = requests.post('http://localhost:8000/optimize/async', json={
    "depots": [...],
    "customers": [...],
    "vehicles": [...],
})

job_id = response.json()['job_id']
print(f"Job submitted: {job_id}")

# Poll for completion
while True:
    status_response = requests.get(f'http://localhost:8000/jobs/{job_id}')
    status = status_response.json()

    print(f"Status: {status['status']}, Progress: {status['progress']}%")

    if status['status'] == 'completed':
        print("Optimization complete!")
        print(f"Total distance: {status['result']['summary']['total_distance_km']} km")
        break
    elif status['status'] == 'failed':
        print(f"Optimization failed: {status['error']}")
        break

    time.sleep(2)
```

## ⚙️ Configuration

### Job Queue Settings

`job_queue.py` parametreleri:

```python
JobQueue(
    max_jobs=100,              # Max jobs in memory
    cleanup_after_seconds=3600  # Cleanup completed jobs after 1 hour
)
```

### Worker Thread

- Single worker thread (sequential processing)
- Jobs processed in FIFO order
- Automatic error handling and retry

### Production Recommendations

**For higher load, consider:**

1. **Redis-based queue** (recommended for multi-instance)
```python
# Use Redis instead of in-memory queue
from redis import Redis
from rq import Queue

redis_conn = Redis(host='localhost', port=6379)
job_queue = Queue(connection=redis_conn)
```

2. **Celery** (full-featured task queue)
```python
from celery import Celery

app = Celery('vrp_optimizer', broker='redis://localhost:6379')

@app.task
def optimize_async(request_data):
    return optimize_routes(**request_data)
```

3. **Background worker service**
- Separate worker service from API
- Scale workers independently
- Better resource isolation

## 🔧 Testing

### Test Async Endpoints

```bash
# 1. Start server
cd railway
python main.py

# 2. Submit test job
curl -X POST http://localhost:8000/optimize/async \
  -H "Content-Type: application/json" \
  -d @test_request.json

# Response: {"job_id": "...", "status": "pending"}

# 3. Check status
curl http://localhost:8000/jobs/<job_id>

# 4. Check queue stats
curl http://localhost:8000/jobs
```

### Test Cancellation

```bash
# Submit job
JOB_ID=$(curl -X POST http://localhost:8000/optimize/async -d @request.json | jq -r .job_id)

# Immediately cancel (while pending)
curl -X DELETE http://localhost:8000/jobs/$JOB_ID

# Check status
curl http://localhost:8000/jobs/$JOB_ID
# Status should be "cancelled"
```

## 📊 Monitoring

### Logs

Job queue logs to stdout:
```
[JobQueue] Worker thread started
[JobQueue] Submitted job 550e8400-e29b-41d4-a716-446655440000
[JobQueue] Processing job 550e8400-e29b-41d4-a716-446655440000
[JobQueue] Job 550e8400-e29b-41d4-a716-446655440000 completed successfully
[JobQueue] Cleaned up 5 old jobs
```

### Metrics

Monitor via `/jobs` endpoint:
- Queue depth (pending jobs)
- Active jobs (running)
- Success/failure rates
- Average completion time

## 🚨 Limitations

**Current Implementation (In-Memory Queue):**

- ❌ **Not persistent** - Jobs lost on restart
- ❌ **Not distributed** - Single worker thread
- ❌ **Not scalable** - Limited to single instance
- ❌ **No priority** - FIFO only
- ✅ **Simple** - No external dependencies
- ✅ **Fast** - Low latency
- ✅ **Sufficient** - For small-medium deployments

**For production with high load:**
- Migrate to Redis + Celery/RQ
- Add job persistence (PostgreSQL)
- Implement job priority
- Add multi-worker support

## 📚 Related Documentation

- [OPTIMIZATION_REPORT.md](./OPTIMIZATION_REPORT.md) - OR-Tools optimizer details
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Railway deployment guide
- [BENCHMARK.md](./BENCHMARK.md) - Performance benchmarks
