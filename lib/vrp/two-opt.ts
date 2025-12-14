import type { DistanceMatrix } from "./types"
import { getDistance } from "./distance"

// 2-opt improvement algorithm
export function twoOpt(route: string[], depotId: string, distanceMatrix: DistanceMatrix): string[] {
  if (route.length < 3) return route

  let improved = true
  let bestRoute = [...route]
  let bestDistance = calculateRouteDistance(bestRoute, depotId, distanceMatrix)

  while (improved) {
    improved = false

    for (let i = 0; i < bestRoute.length - 1; i++) {
      for (let j = i + 2; j < bestRoute.length; j++) {
        // Create new route by reversing segment between i and j
        const newRoute = [
          ...bestRoute.slice(0, i + 1),
          ...bestRoute.slice(i + 1, j + 1).reverse(),
          ...bestRoute.slice(j + 1),
        ]

        const newDistance = calculateRouteDistance(newRoute, depotId, distanceMatrix)

        if (newDistance < bestDistance) {
          bestRoute = newRoute
          bestDistance = newDistance
          improved = true
        }
      }
    }
  }

  return bestRoute
}

function calculateRouteDistance(route: string[], depotId: string, distanceMatrix: DistanceMatrix): number {
  if (route.length === 0) return 0

  let distance = getDistance(distanceMatrix, depotId, route[0])

  for (let i = 0; i < route.length - 1; i++) {
    distance += getDistance(distanceMatrix, route[i], route[i + 1])
  }

  distance += getDistance(distanceMatrix, route[route.length - 1], depotId)

  return distance
}

// Apply 2-opt to all routes
export function improveSolution(
  routes: { stops: string[]; depotId: string }[],
  distanceMatrix: DistanceMatrix,
): string[][] {
  return routes.map((route) => twoOpt(route.stops, route.depotId, distanceMatrix))
}
