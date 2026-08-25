---
title: Benchmark a Model Honestly
type: guide
level: advanced
time: 18 min
order: 7
stack: [Python, LightGBM, MLflow, Prefect]
built: VolForecast
summary: Most forecasting results are leaks or strawmen. Build the baselines first, evaluate walk-forward, and gate promotion on a loss that matches the cost of being wrong.
tags: [guide, quant, mlops, evaluation]
---

# Benchmark a Model Honestly

Almost every impressive time-series result is one of two things: a leak, or a
comparison against a baseline nobody serious uses.

[[VolForecast]] forecasts realised volatility, which is a domain with decades
of strong, boring baselines. That makes it very hard to fool yourself — if you
build them first.

## 1. Build the baselines before the model

Not after. Before. If your model cannot beat HAR, you do not have a model, you
have a plot.

| Baseline | Why it's in the set |
| --- | --- |
| **EWMA** | The trivial one. If you lose here, stop. |
| **GARCH(1,1)** | The academic default for forty years. |
| **HAR-RV** | Heterogeneous autoregressive. Brutally hard to beat. |

Building them first also forces the data pipeline into shape before any
modelling choice can quietly depend on it.

## 2. Walk forward, and be paranoid about it

A random train/test split on time series is not a weak evaluation, it is a
broken one — the model trains on the future.

```
|--- train ---|-- test --|
      |--- train ---|-- test --|
            |--- train ---|-- test --|
```

Refit at each step using only data available at that time. Then check the three
leaks that survive a correct-looking split:

- **Feature leaks.** A rolling feature computed over the whole series before
  splitting has already seen the test set.
- **Scaler leaks.** Fit normalisation inside the fold, never on the full frame.
- **Target leaks.** Realised vol over `[t, t+h]` cannot use anything after `t`.

> [!warning] The tell
> A model that beats HAR by a wide margin on the first try has a leak. Assume
> so and go find it. It is faster than the alternative, which is discovering it
> after you have written it up.

## 3. Pick a loss that matches the cost of the error

RMSE on volatility is the wrong objective and it flatters you. Volatility is
positive, heteroskedastic and heavy-tailed; squared error is dominated by the
few largest observations.

**QLIKE** is the standard for a reason — it penalises *under*-forecasting
volatility much harder than over-forecasting, which is the asymmetry that
actually costs money:

```python
def qlike(actual, pred):
    # Robust to noise in the realised-vol proxy; asymmetric in the
    # direction that matters — under-forecasting risk is the expensive error.
    r = actual / pred
    return float(np.mean(r - np.log(r) - 1))
```

Report RMSE too if you like. Gate on QLIKE.

## 4. Champion / challenger, with an actual gate

Track every run. Promotion is a rule, not a judgement call:

```python
if challenger.qlike < champion.qlike * (1 - MIN_IMPROVEMENT):
    registry.transition(challenger.version, "Production")
else:
    log.info("challenger %s did not clear the gate", challenger.version)
```

`MIN_IMPROVEMENT` exists so noise cannot promote a model. Without a margin you
will ship whichever run got a lucky fold.

Record for every run: data window, feature set, hyperparameters, all baseline
scores, and the git SHA. A result you cannot reproduce is an anecdote.

## 5. Watch for drift, retrain on a trigger

Markets regime-shift; a model tuned on 2023 calm degrades in a vol spike.
Monitor feature distributions and live error, and retrain on a *trigger* rather
than a calendar:

```python
if psi(reference_features, live_features) > 0.2 or rolling_qlike > threshold:
    flow.run("retrain")
```

Retraining on a schedule burns compute when nothing changed and does nothing
when everything did.

## 6. Publish the losses

The most credible section in any model write-up is the one where it loses.
State where the baselines win — short horizons, quiet regimes, thin instruments
— because a model that wins everywhere is a model whose evaluation is broken.

## Related

[[VolForecast]] · [[Validate a Pricing Engine]] · [[Python]] · [[Studio Principles]]
