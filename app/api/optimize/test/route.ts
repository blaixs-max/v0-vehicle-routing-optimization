export async function GET() {
  console.log("[v0] TEST endpoint called")
  return Response.json({ message: "Test endpoint works!" })
}
