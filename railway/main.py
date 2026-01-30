from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

# OR-Tools optimizer scriptini import et
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ortools_optimizer import optimize_routes

app = FastAPI(title="VRP Optimizer API")

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
    required_vehicle_type: Optional[str] = None  # Single required vehicle type (kamyonet, kamyon_1, etc.)

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
    osrm_url: Optional[str] = None  # OSRM API URL for real road distances

class OptimizeResponse(BaseModel):
    success: bool
    routes: List[dict]
    summary: dict
    error: Optional[str] = None

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

@app.post("/optimize", response_model=OptimizeResponse)
def optimize(request: OptimizeRequest):
    try:
        print(f"[Railway] ========== OPTIMIZATION REQUEST ==========")
        print(f"[Railway] Depots: {len(request.depots)}")
        print(f"[Railway] Customers: {len(request.customers)}")
        print(f"[Railway] Vehicles: {len(request.vehicles)}")
        print(f"[Railway] Fuel price: {request.fuel_price}")
        
        # Calculate total demand and capacity
        total_demand = sum(c.demand_pallets for c in request.customers)
        total_capacity = sum(v.capacity_pallets for v in request.vehicles)
        print(f"[Railway] Total demand: {total_demand} pallets")
        print(f"[Railway] Total capacity: {total_capacity} pallets")
        print(f"[Railway] Demand/Capacity ratio: {total_demand/total_capacity:.2f}" if total_capacity > 0 else "[Railway] WARNING: Total capacity is 0!")
        
        # OSRM URL'yi environment variable'a kaydet (optimizer içinde kullanılacak)
        if request.osrm_url:
            os.environ['OSRM_URL'] = request.osrm_url
            print(f"[Railway] Using OSRM URL: {request.osrm_url}")
        
        # OR-Tools optimizer'ı çağır
        result = optimize_routes(
            customers=[c.dict() for c in request.customers],
            vehicles=[v.dict() for v in request.vehicles],
            depots=[d.dict() for d in request.depots],
            fuel_price=request.fuel_price
        )
        
        print(f"[Railway] Optimization successful: {len(result['routes'])} routes generated")
        
        return OptimizeResponse(
            success=True,
            routes=result["routes"],
            summary=result["summary"]
        )
    
    except Exception as e:
        print(f"[Railway] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
