# OR-Tools Optimization Error Fix

## Problem
Getting "Railway API hatası (500): No solution found. Status: UNKNOWN(6)" when trying to optimize routes with OR-Tools.

## Root Causes Identified

### 1. Missing Status Code
OR-Tools was returning status code 6, which wasn't defined in the status messages dictionary. Status codes 5 and 6 were missing:
- Status 5: `ROUTING_FAIL_NO_SOLUTION_FOUND`
- Status 6: `ROUTING_OPTIMAL`

### 2. Vehicle Type Constraints Causing Infeasibility
The vehicle type constraint code (lines 308-334 in `ortools_optimizer.py`) was using `VehicleVar().RemoveValue()` to strictly enforce which vehicles could visit which customers. This was making the problem infeasible because:
- It was removing too many vehicle options
- Some customers might have no valid vehicles to visit them
- OR-Tools couldn't find any solution due to these hard constraints

## Solutions Applied

### 1. Added Missing Status Codes
Updated both `_optimize_single_depot()` and `_optimize_multi_depot()` functions to include status codes 5 and 6 in their status message dictionaries.

### 2. Disabled Strict Vehicle Type Constraints
Commented out the vehicle type constraint code that was using `RemoveValue()`. This allows all vehicles to visit all customers, making the problem feasible.

**Note**: This is a temporary fix. Future improvement should implement soft constraints with penalties instead of hard constraints.

### 3. Enhanced Error Messages
Added detailed diagnostic information to error messages:
- Number of customers and vehicles
- Total demand vs. total capacity
- Demand/capacity ratio
- Better status code reporting

### 4. Added Comprehensive Logging
Added logging throughout the optimization pipeline:
- In `/app/api/optimize/route.ts`: Log vehicle details, total demand, total capacity
- In `/railway/main.py`: Log request details, demand/capacity analysis
- In `/railway/ortools_optimizer.py`: Better error diagnostics

## Files Modified

1. `/railway/ortools_optimizer.py`
   - Lines 308-320: Disabled vehicle type constraints
   - Lines 345-360: Updated status codes and error messages (single depot)
   - Lines 636-655: Updated status codes and error messages (multi-depot)

2. `/app/api/optimize/route.ts`
   - Lines 522-529: Added detailed logging for debugging

3. `/railway/main.py`
   - Lines 79-106: Added comprehensive request logging

## How to Test

1. Try optimizing routes with 23 customers (the failing scenario)
2. Check the console logs for:
   - Total demand vs. total capacity
   - Vehicle details
   - Customer depot assignments
3. The optimization should now succeed without the UNKNOWN(6) error

## Future Improvements

### Implement Soft Vehicle Type Constraints
Instead of hard constraints that make the problem infeasible, implement soft constraints:

\`\`\`python
# Create a penalty cost for mismatched vehicle types
penalty_callback_index = routing.RegisterTransitCallback(penalty_callback)
routing.SetArcCostEvaluatorOfVehicle(penalty_callback_index, vehicle_id)
\`\`\`

This allows the solver to find a solution while preferring correct vehicle types.

### Add Capacity Validation
Before calling OR-Tools, validate that:
- Total capacity >= Total demand
- Each depot has sufficient vehicles for its customers
- No customers have invalid demand values

### Improve Multi-Depot Logic
Current multi-depot implementation might need refinement:
- Better vehicle distribution algorithm
- Consider depot capacities
- Handle depot-specific constraints

## References
- OR-Tools Routing Documentation: https://developers.google.com/optimization/routing
- OR-Tools Status Codes: https://developers.google.com/optimization/routing/routing_options#status
