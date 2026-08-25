---
title: Validate a Pricing Engine
type: guide
level: advanced
time: 17 min
order: 8
stack: [Python, NumPy, JAX, FastAPI]
built: QuantFlex
summary: If you hand-roll Monte Carlo, PDE solvers and autodiff, the hard part is not writing them — it is proving they are right.
tags: [guide, quant, numerics, testing]
---

# Validate a Pricing Engine

Writing a Monte Carlo pricer is a weekend. Knowing whether it is *correct* is
the actual project — a subtly wrong pricer produces plausible numbers forever
and never throws.

[[QuantFlex]] prices vanillas, Americans, exotics and baskets under GBM,
Merton and Heston with hand-rolled solvers. Here is the validation scaffolding
that makes that defensible.

## Principle: write the oracle before the solver

An oracle is anything that gives you the right answer independently. You have
more of them than you think, and each catches a different class of bug.

## 1. Anchor to closed form wherever one exists

Black-Scholes is the anchor for every GBM engine. Your Monte Carlo, your PDE
grid and your tree must all converge to it:

```python
def test_mc_matches_black_scholes():
    analytic = bs_call(S=100, K=100, r=0.05, q=0.0, sigma=0.2, T=1.0)
    mc = monte_carlo_call(S=100, K=100, r=0.05, sigma=0.2, T=1.0,
                          paths=1_000_000, seed=0)
    # 3 standard errors: tight enough to catch bugs, loose enough not to flake.
    assert abs(mc.price - analytic) < 3 * mc.stderr
```

Assert against the **standard error**, not a hard tolerance. A hard tolerance
either flakes or hides a real drift when you change the path count.

## 2. Test the invariants, not just the values

Invariants hold across every model and catch whole categories of error:

- **Put–call parity.** `C - P == S·e^{-qT} - K·e^{-rT}`. Fails loudly on sign
  and discounting bugs.
- **Monotonicity.** A call is non-decreasing in spot and in volatility.
- **Bounds.** `max(S - Ke^{-rT}, 0) ≤ C ≤ S`. Cheap and surprisingly effective.
- **American ≥ European.** Early exercise cannot be worth negative.
- **Convergence.** Halve the timestep, expect the error to fall at the scheme's
  advertised order. If it doesn't, your discretisation is wrong even when the
  price looks fine.

## 3. Triple-verify the Greeks

Greeks are where hand-rolled autodiff quietly goes wrong, because a tape bug
gives you a *smooth, plausible* number. Three independent routes must agree:

| Route | Catches |
| --- | --- |
| Your autodiff tape | — (the thing under test) |
| Bump-and-revalue | tape wiring, sign errors |
| JAX `grad` on the same payoff | your entire tape implementation |

```python
@pytest.mark.parametrize("greek", ["delta", "vega", "rho", "theta"])
def test_greeks_agree(greek):
    tape = engine.greeks(**params)[greek]
    bump = finite_difference(engine.price, greek, **params)
    ref  = jax.grad(jax_price, argnums=ARG[greek])(**jax_params)
    assert abs(tape - bump) < 1e-3
    assert abs(tape - ref)  < 1e-6      # same maths, so this should be tight
```

JAX is a **test-time oracle only** here. Shipping it as the engine would defeat
the point of writing the tape; not testing against it would be negligent.

## 4. Fix your seeds and use common random numbers

Same seed, same paths, every run. Then price the bumped and unbumped cases on
*the same* paths — common random numbers cut finite-difference Greek variance
by orders of magnitude and make the comparison in step 3 meaningful at all.

## 5. Keep a benchmark table under version control

Published values for Heston and Merton exist in the literature. Pin them:

```python
HESTON_BENCHMARKS = [
    # (S, K, T, v0, kappa, theta, xi, rho, expected, source)
    (100, 100, 1.0, 0.04, 2.0, 0.04, 0.3, -0.7, 8.1663, "Albrecher et al. 2007"),
]
```

Now a refactor that shifts the fourth decimal fails CI with a citation
attached, instead of being noticed a month later.

## 6. Make the American case explicit

Longstaff–Schwartz is where regression choices leak into prices. Test that the
American price sits above the European one, that it converges as basis
functions increase, and that a zero-dividend American call equals the European
one — a specific, well-known identity that catches early-exercise logic bugs
immediately.

## The takeaway

> The analytic anchors caught more bugs than the unit tests did.

Which is [[Studio Principles|principle 5]]. Write the oracle first; the solver
is the easy half.

## Related

[[QuantFlex]] · [[Benchmark a Model Honestly]] · [[Python]] · [[Studio Principles]]
