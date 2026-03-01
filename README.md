# OpenClaw Crypto Trading Agent

## Security-First Crypto Arb & DeFi Yield Agent

A pure-Python trading agent stack built on OpenClaw for autonomous crypto
arbitrage and funding rate capture. Designed for privacy, auditability,
and brutal risk management.

## ⚠️ CRITICAL WARNINGS

1. **THIS IS NOT FINANCIAL ADVICE.** Most trading agents lose money.
2. **MALWARE IS REAL.** 300-900+ malicious skills hit ClawHub in Jan-Feb 2026.
   NEVER install any skill without reading every line of source code.
3. **START WITH PAPER TRADING.** Run 200+ paper trades before any real capital.
4. **MAX $500 IN HOT WALLETS.** Never risk money you can't lose.

## Architecture

```
YOUR LOCAL MAC (development + backtesting)
   ↓ git push / docker build
ISOLATED VPS ($6-12/mo Hetzner/DigitalOcean)
   └─ Docker Compose
        ├─ OpenClaw (orchestrator + Telegram interface)
        ├─ Funding Rate Arb (Python skill - ccxt)
        ├─ Polymarket Logic Arb (Python skill - Gamma API)
        └─ Risk Gate (circuit breakers, daily loss limits)
   Firewall: SSH from your IP only, outbound to exchanges
```

## Skills

### 1. Funding Rate Arb (`skills/funding-rate-arb/`)
- Monitors BTC/ETH/SOL funding rates across Binance, Bybit, OKX
- Detects cross-exchange spreads above threshold (after fees)
- Executes delta-neutral positions (long low / short high)
- Commands: `scan funding arb`, `execute funding arb`, `funding arb status`

### 2. Polymarket Logic Arb (`skills/polymarket-logic-arb/`)
- Scans for sum-to-1 pricing inefficiencies
- Skeleton for correlated market analysis (add YOUR edge)
- Commands: `scan polymarket arb`, `scan polymarket correlated [keyword]`

## Quick Start

### Week 1: Local Development
```bash
# Install OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard  # Connect Telegram

# Install vetted skills (REVIEW SOURCE FIRST)
openclaw skill add https://github.com/chainstacklabs/polyclaw

# Add custom skills
openclaw skill add ./skills/funding-rate-arb
openclaw skill add ./skills/polymarket-logic-arb

# Test in Telegram:
# "scan funding arb"
# "scan polymarket arb"
```

### Week 2-3: Paper Trading
- Set PAPER_MODE=true in .env (default)
- Run for 7-14 days, review every trade in logs/
- Tune thresholds based on what you see

### Week 4: VPS Deployment
```bash
# On VPS (Ubuntu 24.04)
sudo ./setup-vps.sh
cp .env.example .env
# Edit .env with your keys
docker compose up -d
```

## Risk Controls (Hardcoded)

| Control | Default | Notes |
|---------|---------|-------|
| Paper mode | ON | Must explicitly disable |
| Max position | $50 | Per leg |
| Daily loss limit | $25 | Circuit breaker |
| Approval threshold | $100 | Telegram confirmation |
| Daily trade cap | 20 | Sanity limit |
| Audit log | Always on | Immutable JSONL |

## File Structure

```
openclaw-trading-agent/
├── docker-compose.yml          # VPS deployment
├── .env.example                # Template (NEVER commit .env)
├── setup-vps.sh                # One-time VPS hardening
├── skills/
│   ├── Dockerfile              # Python runtime container
│   ├── requirements.txt        # Python dependencies
│   ├── funding-rate-arb/
│   │   ├── SKILL.md            # OpenClaw skill definition
│   │   └── main.py             # Scanner + executor
│   └── polymarket-logic-arb/
│       ├── SKILL.md
│       └── main.py             # Scanner (add your edge here)
├── logs/                       # Structured trade logs (JSONL)
├── data/                       # Trade records, backtest data
└── README.md
```

## Where YOUR Edge Goes

The framework handles scanning, risk, execution, and logging.
Your competitive advantage comes from:

1. **Custom filters in `scan_correlated()`** — sentiment, on-chain data,
   domain expertise that other bots don't have
2. **Threshold tuning** — based on your backtesting and paper results
3. **Market selection** — which pairs, which prediction markets
4. **Discipline** — not overriding the risk gates when you're "sure"

## License

Use at your own risk. No warranty. Not financial advice.
