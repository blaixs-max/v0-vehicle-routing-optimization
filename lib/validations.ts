import { z } from "zod"

// Coordinate validation
export const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
  lng: z.number().min(-180).max(180, "Longitude must be between -180 and 180"),
})

// Customer validation
export const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(255),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  district: z.string().optional(),
  lat: z.number().refine((val) => val !== 0, "Invalid latitude"),
  lng: z.number().refine((val) => val !== 0, "Invalid longitude"),
  demand_pallet: z.number().min(0, "Demand must be non-negative"),
  depot_id: z.string().optional(),
  required_vehicle_type: z.string().nullable().optional(),
  service_duration_min: z.number().min(5).max(240).optional(),
  service_duration_minutes: z.number().min(5).max(240).optional(),
  assigned_depot_id: z.string().optional(),
})

export const customerArraySchema = z.array(customerSchema)

// Vehicle validation
export const vehicleSchema = z.object({
  id: z.string().optional(),
  plate: z.string().min(1, "Plate is required").max(20),
  capacity_pallet: z.number().min(1, "Capacity must be at least 1"),
  vehicle_type: z.number().min(1).max(3),
  depot_id: z.string().min(1, "Depot ID is required"),
  fuel_consumption_per_km: z.number().min(0).optional(),
  cost_per_km: z.number().min(0).optional(),
  fixed_cost: z.number().min(0).optional(),
})

export const vehicleArraySchema = z.array(vehicleSchema)

// Depot validation
export const depotSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(255),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  lat: z.number().refine((val) => val !== 0, "Invalid latitude"),
  lng: z.number().refine((val) => val !== 0, "Invalid longitude"),
})

export const depotArraySchema = z.array(depotSchema)

// Stop validation
export const stopSchema = z.object({
  customerId: z.string().min(1),
  stopOrder: z.number().min(1),
  distanceFromPrev: z.number().min(0).optional(),
  durationFromPrev: z.number().min(0).optional(),
  cumulativeDistance: z.number().min(0).optional(),
  cumulativeLoad: z.number().min(0).optional(),
  arrivalTime: z.string().nullable().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
})

// Route validation
export const routeSchema = z.object({
  id: z.string().min(1),
  vehicleId: z.string().min(1),
  depotId: z.string().min(1),
  routeDate: z.string().optional(),
  totalDistance: z.number().min(0),
  totalDuration: z.number().min(0),
  totalPallets: z.number().min(0).optional(),
  totalCost: z.number().min(0),
  fuelCost: z.number().min(0),
  distanceCost: z.number().min(0),
  fixedCost: z.number().min(0),
  tollCost: z.number().min(0).optional(),
  tollCrossings: z.array(z.any()).optional(),
  highwayUsage: z.array(z.any()).optional(),
  geometry: z.string().nullable().optional(),
  stops: z.array(stopSchema).min(1, "At least one stop is required"),
})

// Routes POST body validation
export const saveRoutesSchema = z.object({
  routes: z.array(routeSchema).min(1, "At least one route is required"),
  optimization_id: z.string().optional(),
})

// Optimization request validation
export const optimizationRequestSchema = z.object({
  depotId: z.string().min(1, "Depot ID is required"),
  vehicleIds: z.array(z.string()).min(1, "At least one vehicle is required"),
  customerIds: z.array(z.string()).min(1, "At least one customer is required"),
  maxRouteTime: z.number().min(1).max(1440).optional(), // Max 24 hours
})
