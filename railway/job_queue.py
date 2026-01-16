"""
Async Job Queue for OR-Tools Optimizer

Simple in-memory job queue for handling long-running optimization tasks.
For production, consider using Redis or a proper task queue (Celery, RQ).
"""

import uuid
import time
from typing import Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass, field, asdict
from datetime import datetime
import threading
from queue import Queue
import json


class JobStatus(str, Enum):
    """Job status enum"""
    PENDING = "pending"       # Job queued, not started
    RUNNING = "running"       # Job currently executing
    COMPLETED = "completed"   # Job finished successfully
    FAILED = "failed"         # Job failed with error
    CANCELLED = "cancelled"   # Job cancelled by user


@dataclass
class Job:
    """Job data structure"""
    id: str
    status: JobStatus = JobStatus.PENDING
    progress: int = 0  # 0-100
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    request_data: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict for JSON serialization"""
        data = asdict(self)
        data["status"] = self.status.value
        # Add elapsed time
        if self.started_at:
            if self.completed_at:
                data["elapsed_seconds"] = round(self.completed_at - self.started_at, 2)
            else:
                data["elapsed_seconds"] = round(time.time() - self.started_at, 2)
        # Remove request_data from response (can be large)
        data.pop("request_data", None)
        return data


class JobQueue:
    """
    Simple in-memory job queue

    Features:
    - Job submission and tracking
    - Background worker thread
    - Job status queries
    - Automatic cleanup of old jobs
    """

    def __init__(self, max_jobs: int = 100, cleanup_after_seconds: int = 3600):
        self.jobs: Dict[str, Job] = {}
        self.max_jobs = max_jobs
        self.cleanup_after_seconds = cleanup_after_seconds
        self.job_queue: Queue = Queue()
        self.lock = threading.Lock()
        self._stop_worker = False

        # Start background worker
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()

    def submit_job(self, request_data: Dict[str, Any]) -> str:
        """
        Submit a new job to the queue

        Args:
            request_data: The optimization request data

        Returns:
            job_id: Unique job identifier
        """
        job_id = str(uuid.uuid4())
        job = Job(id=job_id, request_data=request_data)

        with self.lock:
            # Cleanup old jobs if queue is full
            if len(self.jobs) >= self.max_jobs:
                self._cleanup_old_jobs()

            self.jobs[job_id] = job

        # Add to queue for processing
        self.job_queue.put(job_id)

        print(f"[JobQueue] Submitted job {job_id}")
        return job_id

    def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID"""
        with self.lock:
            return self.jobs.get(job_id)

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status dict"""
        job = self.get_job(job_id)
        if job:
            return job.to_dict()
        return None

    def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a pending job

        Returns:
            bool: True if cancelled, False if job not found or already running
        """
        with self.lock:
            job = self.jobs.get(job_id)
            if job and job.status == JobStatus.PENDING:
                job.status = JobStatus.CANCELLED
                print(f"[JobQueue] Cancelled job {job_id}")
                return True
        return False

    def _worker(self):
        """Background worker that processes jobs from queue"""
        from ortools_optimizer_v2 import optimize_routes, OptimizerConfig

        print("[JobQueue] Worker thread started")

        while not self._stop_worker:
            try:
                # Get job from queue (blocks until available)
                job_id = self.job_queue.get(timeout=1)

                with self.lock:
                    job = self.jobs.get(job_id)
                    if not job or job.status == JobStatus.CANCELLED:
                        continue

                    job.status = JobStatus.RUNNING
                    job.started_at = time.time()
                    job.progress = 10

                print(f"[JobQueue] Processing job {job_id}")

                try:
                    # Extract request data
                    request = job.request_data

                    # Create config
                    config = OptimizerConfig(
                        time_limit_seconds=request.get("time_limit_seconds", 45),
                        search_strategy=request.get("search_strategy", "SAVINGS"),
                        use_local_search=request.get("use_local_search", True),
                        enable_time_windows=request.get("enable_time_windows", False)
                    )

                    # Run optimization
                    with self.lock:
                        job.progress = 30

                    result = optimize_routes(
                        depots=request["depots"],
                        customers=request["customers"],
                        vehicles=request["vehicles"],
                        fuel_price=request.get("fuel_price", 47.5),
                        config=config
                    )

                    # Mark as completed
                    with self.lock:
                        job.status = JobStatus.COMPLETED
                        job.result = result
                        job.completed_at = time.time()
                        job.progress = 100

                    print(f"[JobQueue] Job {job_id} completed successfully")

                except Exception as e:
                    # Mark as failed
                    with self.lock:
                        job.status = JobStatus.FAILED
                        job.error = str(e)
                        job.completed_at = time.time()

                    print(f"[JobQueue] Job {job_id} failed: {str(e)}")

            except Exception as e:
                # Queue timeout or other error - continue
                if str(e) != "":  # Don't log timeout
                    print(f"[JobQueue] Worker error: {str(e)}")

        print("[JobQueue] Worker thread stopped")

    def _cleanup_old_jobs(self):
        """Remove old completed/failed jobs"""
        now = time.time()
        to_remove = []

        for job_id, job in self.jobs.items():
            if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
                if job.completed_at and (now - job.completed_at) > self.cleanup_after_seconds:
                    to_remove.append(job_id)

        for job_id in to_remove:
            del self.jobs[job_id]
            print(f"[JobQueue] Cleaned up old job {job_id}")

        if to_remove:
            print(f"[JobQueue] Cleaned up {len(to_remove)} old jobs")

    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        with self.lock:
            stats = {
                "total_jobs": len(self.jobs),
                "pending": sum(1 for j in self.jobs.values() if j.status == JobStatus.PENDING),
                "running": sum(1 for j in self.jobs.values() if j.status == JobStatus.RUNNING),
                "completed": sum(1 for j in self.jobs.values() if j.status == JobStatus.COMPLETED),
                "failed": sum(1 for j in self.jobs.values() if j.status == JobStatus.FAILED),
                "cancelled": sum(1 for j in self.jobs.values() if j.status == JobStatus.CANCELLED),
                "queue_size": self.job_queue.qsize(),
            }
        return stats

    def shutdown(self):
        """Shutdown the worker thread"""
        print("[JobQueue] Shutting down worker...")
        self._stop_worker = True
        self.worker_thread.join(timeout=5)


# Global job queue instance
_job_queue: Optional[JobQueue] = None


def get_job_queue() -> JobQueue:
    """Get or create global job queue instance"""
    global _job_queue
    if _job_queue is None:
        _job_queue = JobQueue()
    return _job_queue
