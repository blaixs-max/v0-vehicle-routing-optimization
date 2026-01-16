#!/usr/bin/env python3
"""
Test script for async job queue

Tests:
1. Job submission
2. Status polling
3. Job completion
4. Queue statistics
"""

import time
import random
from job_queue import get_job_queue, JobStatus

print("="*60)
print("Async Job Queue Test")
print("="*60)

# Initialize queue
job_queue = get_job_queue()

# Generate test data
print("\n1. Generating test data...")
center_lat, center_lng = 41.0082, 28.9784

test_request = {
    "depots": [{"id": "depot-1", "location": {"lat": center_lat, "lng": center_lng}}],
    "customers": [
        {
            "id": f"c-{i}",
            "name": f"Customer {i}",
            "location": {
                "lat": center_lat + random.uniform(-0.2, 0.2),
                "lng": center_lng + random.uniform(-0.2, 0.2)
            },
            "demand_pallets": random.randint(1, 3),
            "business_type": "restaurant",
            "service_duration": 30,
            "has_time_constraint": False,
        }
        for i in range(15)
    ],
    "vehicles": [
        {"id": f"v-{i}", "type": 2, "capacity_pallets": 12, "fuel_consumption": 25.0}
        for i in range(3)
    ],
    "fuel_price": 47.5,
    "time_limit_seconds": 20,
    "search_strategy": "SAVINGS",
    "use_local_search": True,
    "enable_time_windows": False,
}

print(f"  Depots: {len(test_request['depots'])}")
print(f"  Customers: {len(test_request['customers'])}")
print(f"  Vehicles: {len(test_request['vehicles'])}")

# Test 1: Submit job
print("\n2. Submitting job...")
job_id = job_queue.submit_job(test_request)
print(f"  ✓ Job submitted: {job_id}")

# Test 2: Get immediate status
print("\n3. Checking initial status...")
status = job_queue.get_job_status(job_id)
print(f"  Status: {status['status']}")
print(f"  Progress: {status['progress']}%")
assert status['status'] == 'pending', "Initial status should be pending"

# Test 3: Poll for completion
print("\n4. Polling for completion...")
max_wait = 60  # seconds
start_time = time.time()

while time.time() - start_time < max_wait:
    status = job_queue.get_job_status(job_id)
    elapsed = time.time() - start_time

    print(f"  [{elapsed:.1f}s] Status: {status['status']}, Progress: {status['progress']}%")

    if status['status'] in ['completed', 'failed', 'cancelled']:
        break

    time.sleep(2)

# Test 4: Check final result
print("\n5. Final result:")
final_status = job_queue.get_job_status(job_id)

if final_status['status'] == 'completed':
    print(f"  ✓ Job completed successfully!")
    print(f"  Elapsed: {final_status.get('elapsed_seconds', 0):.2f}s")

    result = final_status.get('result')
    if result:
        print(f"  Routes: {len(result.get('routes', []))}")
        print(f"  Total distance: {result.get('summary', {}).get('total_distance_km', 0):.1f} km")
elif final_status['status'] == 'failed':
    print(f"  ✗ Job failed: {final_status.get('error')}")
else:
    print(f"  ⚠ Job status: {final_status['status']}")

# Test 5: Queue statistics
print("\n6. Queue statistics:")
stats = job_queue.get_queue_stats()
print(f"  Total jobs: {stats['total_jobs']}")
print(f"  Pending: {stats['pending']}")
print(f"  Running: {stats['running']}")
print(f"  Completed: {stats['completed']}")
print(f"  Failed: {stats['failed']}")

# Test 6: Submit multiple jobs
print("\n7. Testing multiple jobs...")
job_ids = []
for i in range(3):
    jid = job_queue.submit_job(test_request)
    job_ids.append(jid)
    print(f"  Submitted job {i+1}: {jid}")

print(f"\n8. Queue after multiple submissions:")
stats = job_queue.get_queue_stats()
print(f"  Queue size: {stats['queue_size']}")
print(f"  Pending: {stats['pending']}")

# Wait a bit for jobs to start processing
print("\n9. Waiting for jobs to process...")
time.sleep(5)

stats = job_queue.get_queue_stats()
print(f"  Pending: {stats['pending']}")
print(f"  Running: {stats['running']}")
print(f"  Completed: {stats['completed']}")

# Test 7: Cancel a pending job (if any)
if stats['pending'] > 0:
    print("\n10. Testing job cancellation...")
    # Find a pending job
    for jid in job_ids:
        job = job_queue.get_job(jid)
        if job and job.status == JobStatus.PENDING:
            cancelled = job_queue.cancel_job(jid)
            if cancelled:
                print(f"  ✓ Cancelled job: {jid}")
            break
else:
    print("\n10. Skipping cancellation test (no pending jobs)")

print("\n" + "="*60)
print("✅ All tests completed!")
print("="*60)

# Cleanup
print("\nShutting down worker thread...")
job_queue.shutdown()
print("Done!")
