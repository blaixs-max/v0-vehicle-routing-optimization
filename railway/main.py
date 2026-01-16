from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

# OR-Tools optimizer scriptini import et
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# v2 optimizer (optimized version)
from ortools_optimizer_v2 import optimize_routes, OptimizerConfig

app = FastAPI(
    title="VRP Optimizer API",
    description="Optimized Vehicle Routing Problem solver using OR-Tools",
    version="2.0.0"
)

# CORS - Vercel'den gelen isteklere izin ver
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production'da Vercel domain'ine kısıtla
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response modelleri
class Location(BaseModel):
    lat: float
    lng: float

class Customer(BaseModel):
    id: str
    name: str
    location: Location
    demand_pallets: int
    business_type: str
    service_duration: int
    has_time_constraint: bool = False
    constraint_start_time: Optional[str] = None  # Format: "HH:MM" - start of CLOSED period
    constraint_end_time: Optional[str] = None    # Format: "HH:MM" - end of CLOSED period
    required_vehicle_types: Optional[List[int]] = None

class Vehicle(BaseModel):
    id: str
    type: int
    capacity_pallets: int
    fuel_consumption: float

class Depot(BaseModel):
    id: str
    location: Location

class OptimizeRequest(BaseModel):
    customers: List[Customer]
    vehicles: List[Vehicle]
    depots: List[Depot]
    fuel_price: float = 47.50
    # Optional configuration
    time_limit_seconds: Optional[int] = 45
    search_strategy: Optional[str] = "SAVINGS"
    use_local_search: Optional[bool] = True
    enable_time_windows: Optional[bool] = False

class OptimizeResponse(BaseModel):
    success: bool
    routes: List[dict]
    summary: dict
    error: Optional[str] = None

class ConfigResponse(BaseModel):
    default_config: dict
    available_strategies: List[str]
    available_metaheuristics: List[str]

@app.get("/")
def root():
    return {
        "service": "VRP Optimizer",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/config", response_model=ConfigResponse)
def get_config():
    """Get available optimizer configuration options"""
    return ConfigResponse(
        default_config={
            "time_limit_seconds": 45,
            "search_strategy": "SAVINGS",
            "use_local_search": True,
            "local_search_metaheuristic": "GUIDED_LOCAL_SEARCH",
            "enable_time_windows": False,
            "default_speed_kmh": 60,
            "solution_limit": 100
        },
        available_strategies=[
            "SAVINGS",
            "PATH_CHEAPEST_ARC",
            "PARALLEL_CHEAPEST_INSERTION",
            "LOCAL_CHEAPEST_INSERTION",
            "AUTOMATIC"
        ],
        available_metaheuristics=[
            "GUIDED_LOCAL_SEARCH",
            "TABU_SEARCH",
            "SIMULATED_ANNEALING",
            "GREEDY_DESCENT"
        ]
    )

@app.post("/optimize", response_model=OptimizeResponse)
def optimize(request: OptimizeRequest):
    try:
        # Create custom config from request
        config = OptimizerConfig(
            time_limit_seconds=request.time_limit_seconds or 45,
            search_strategy=request.search_strategy or "SAVINGS",
            use_local_search=request.use_local_search if request.use_local_search is not None else True,
            enable_time_windows=request.enable_time_windows or False
        )

        # OR-Tools optimizer'ı çağır
        result = optimize_routes(
            depots=[d.dict() for d in request.depots],
            customers=[c.dict() for c in request.customers],
            vehicles=[v.dict() for v in request.vehicles],
            fuel_price=request.fuel_price,
            config=config
        )

        return OptimizeResponse(
            success=True,
            routes=result["routes"],
            summary=result["summary"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
