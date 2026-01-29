# 🚀 Deployment Guide - Route Optimization Fix

## Railway Only Deploys from Main Branch

Since Railway doesn't support staging environments from different branches, follow this careful deployment process.

---

## ⚠️ Pre-Deployment Checklist

### 1. Run Local Tests FIRST

```bash
# Navigate to railway directory
cd railway

# Run the test script
python test_vehicle_limit.py
```

**Expected Output:**
```
✓ OPTIMAL VEHICLE COUNT: 2-4 (depending on scenario)
✅ PASS: Capacity >= Demand (for all scenarios)
```

If ANY test fails, DO NOT deploy!

---

### 2. Review Changes

Files modified:
- `railway/ortools_optimizer.py` (3 functions updated)
  - Line 255-281: Single depot vehicle limiting
  - Line 344: Fixed cost increased to 50,000
  - Line 161-182: Multi-depot vehicle limiting
  - Line 655-674: Multi-depot helper function
  - Line 750: Fixed cost increased to 50,000

---

## 📦 Deployment Steps

### Step 1: Commit to Main
```bash
git add railway/ortools_optimizer.py
git add railway/test_vehicle_limit.py
git add docs/

git commit -m "fix: optimize vehicle count - limit to 2-3 routes based on demand"

git push origin main
```

### Step 2: Railway Auto-Deploy
Railway will automatically detect the push and deploy.

**Monitor deployment:**
1. Go to Railway Dashboard
2. Watch the deployment logs
3. Ensure deployment succeeds (green checkmark)

---

## 🔍 Post-Deployment Verification

### 1. Check Railway Logs

After deployment, trigger one optimization and watch Railway logs for:

```
[OR-Tools] ===== VEHICLE OPTIMIZATION =====
[OR-Tools] Total demand: XX pallets
[OR-Tools] Max vehicle capacity: XX pallets
[OR-Tools] Min vehicles needed: X
[OR-Tools] Optimal vehicle count (with buffer): X
[OR-Tools] Available vehicles: 50
[OR-Tools] Vehicles to use: 2-4  ← Should be 2-4, not 6+
```

### 2. Test with Real Order

Create a test optimization:
- **Low demand scenario:** 5-10 customers, ~30-40 pallets
- **Expected result:** 2-3 routes maximum
- **Previous result:** 6 routes

### 3. Verify Results

Check optimization results for:
- ✅ Route count: 2-3 (not 6)
- ✅ All customers served
- ✅ No capacity violations
- ✅ Reasonable total distance

---

## 🔄 Rollback Plan (If Issues)

If production issues occur:

### Option A: Quick Fix via Git
```bash
# Revert the commit
git revert HEAD
git push origin main
```

Railway will auto-deploy the reverted code.

### Option B: Temporary Manual Fix

In Railway Dashboard:
1. Go to Variables
2. Add `FORCE_VEHICLE_COUNT=6` (emergency override)
3. Modify code to check this env var
4. Redeploy

---

## 📊 Success Metrics

After 24 hours of production use:

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| Avg Routes/Optimization | 6 | 2-3 | ⏳ |
| Total Distance | Baseline | Similar or better | ⏳ |
| Capacity Utilization | ~50% | 70-85% | ⏳ |
| Failed Optimizations | 0 | 0 | ⏳ |

---

## 🐛 Troubleshooting

### Issue: Still getting 6 routes

**Possible causes:**
1. Railway hasn't deployed latest code
   - Check Railway commit hash matches local
2. Very high demand (>150 pallets)
   - This is expected, 6 vehicle cap is working
3. Multiple depots spreading vehicles
   - Review multi-depot logic

**Debug:**
```bash
# Check Railway logs for vehicle count
# Look for "Optimal vehicle count" line
```

### Issue: Capacity violations

**Possible causes:**
1. Buffer too aggressive (20% may not be enough)
   - Increase buffer from 1.2 to 1.3
2. Mixed capacity vehicles
   - Using average instead of max capacity

**Fix:**
```python
# In ortools_optimizer.py, change:
math.ceil(min_vehicles_needed * 1.2)  # 20%
# To:
math.ceil(min_vehicles_needed * 1.3)  # 30%
```

### Issue: Algorithm taking too long

**Possible causes:**
1. Fixed cost too high restricting solutions
   - Reduce from 50,000 to 30,000

**Fix:**
```python
routing.SetFixedCostOfAllVehicles(30000)  # Try lower value
```

---

## 📞 Support

If issues persist:
1. Check Railway logs first
2. Review `docs/ROUTE-COUNT-FIX.md` for technical details
3. Run `test_vehicle_limit.py` locally to verify logic
4. Revert if necessary using rollback plan

---

## ✅ Deployment Confirmation

After successful deployment, confirm:

- [ ] Test script passes locally
- [ ] Code committed to main
- [ ] Railway deployment succeeded
- [ ] Logs show vehicle optimization messages
- [ ] Test optimization produces 2-3 routes
- [ ] All customers served without errors

**Deployment Date:** _____________

**Deployed By:** _____________

**First Prod Test Result:** _____________ routes generated
