# UTM Link Convention — HammerLock AI

Base URL: `https://hammerlockai.com`

All outbound links should include UTM parameters for conversion tracking.
UTM data is captured by middleware → stored in `hlk_utm` cookie → passed to Stripe on checkout.

---

## Convention

| Parameter | Purpose | Examples |
|-----------|---------|----------|
| `utm_source` | Where the link is placed | `twitter`, `linkedin`, `reddit`, `hackernews`, `producthunt`, `youtube`, `podcast`, `email` |
| `utm_medium` | Channel type | `social`, `organic`, `influencer`, `newsletter`, `email`, `paid` |
| `utm_campaign` | Specific campaign | `launch_feb26`, `ph_launch`, `reply_engagement`, `sponsor_mar26`, `welcome_series` |
| `utm_content` | Variant (optional) | `tweet1`, `bio_link`, `thread_reply`, `dm_outreach` |

---

## Ready-to-Use Links

### X / Twitter
| Context | Full Link |
|---------|-----------|
| Bio link | `https://hammerlockai.com?utm_source=twitter&utm_medium=social&utm_campaign=launch_feb26&utm_content=bio_link` |
| Thread tweet | `https://hammerlockai.com?utm_source=twitter&utm_medium=social&utm_campaign=launch_feb26&utm_content=thread` |
| Reply to viral tweet | `https://hammerlockai.com?utm_source=twitter&utm_medium=social&utm_campaign=reply_engagement` |
| DM to influencer | `https://hammerlockai.com?utm_source=twitter&utm_medium=influencer&utm_campaign=launch_feb26&utm_content=dm_outreach` |

### LinkedIn
| Context | Full Link |
|---------|-----------|
| Post first comment | `https://hammerlockai.com?utm_source=linkedin&utm_medium=social&utm_campaign=launch_feb26` |

### Reddit
| Context | Full Link |
|---------|-----------|
| Comment reply | `https://hammerlockai.com?utm_source=reddit&utm_medium=organic&utm_campaign=launch_feb26&utm_content=reply` |
| r/selfhosted post | `https://hammerlockai.com?utm_source=reddit&utm_medium=organic&utm_campaign=launch_feb26&utm_content=selfhosted` |
| r/privacy post | `https://hammerlockai.com?utm_source=reddit&utm_medium=organic&utm_campaign=launch_feb26&utm_content=privacy` |
| r/LocalLLaMA post | `https://hammerlockai.com?utm_source=reddit&utm_medium=organic&utm_campaign=launch_feb26&utm_content=localllama` |
| r/SideProject post | `https://hammerlockai.com?utm_source=reddit&utm_medium=organic&utm_campaign=launch_feb26&utm_content=sideproject` |

### Hacker News
| Context | Full Link |
|---------|-----------|
| Show HN | `https://hammerlockai.com?utm_source=hackernews&utm_medium=organic&utm_campaign=launch_feb26` |

### Product Hunt
| Context | Full Link |
|---------|-----------|
| PH listing | `https://hammerlockai.com?utm_source=producthunt&utm_medium=organic&utm_campaign=ph_launch` |

### YouTube Creators
| Context | Full Link |
|---------|-----------|
| Video description | `https://hammerlockai.com?utm_source=youtube&utm_medium=influencer&utm_campaign={creator_name}` |
| Creator discount code page | `https://hammerlockai.com?utm_source=youtube&utm_medium=influencer&utm_campaign={creator_name}&utm_content=discount` |

### Newsletter Sponsorships
| Context | Full Link |
|---------|-----------|
| Ben's Bites | `https://hammerlockai.com?utm_source=bensbites&utm_medium=newsletter&utm_campaign=sponsor_mar26` |
| TLDR AI | `https://hammerlockai.com?utm_source=tldrai&utm_medium=newsletter&utm_campaign=sponsor_mar26` |

### Podcasts
| Context | Full Link |
|---------|-----------|
| Mentioned in episode | `https://hammerlockai.com?utm_source=podcast&utm_medium=influencer&utm_campaign={show_name}` |

### Email Campaigns
| Context | Full Link |
|---------|-----------|
| Welcome series | `https://hammerlockai.com?utm_source=email&utm_medium=email&utm_campaign=welcome_series` |
| Product update | `https://hammerlockai.com?utm_source=email&utm_medium=email&utm_campaign=update_{date}` |
| Personal outreach | `https://hammerlockai.com?utm_source=email&utm_medium=email&utm_campaign=personal_outreach` |

---

## How It Works

1. User clicks a UTM-tagged link → lands on hammerlockai.com
2. Middleware captures UTM params → stores in `hlk_utm` cookie (30-day, first-touch)
3. User browses site, clicks pricing, enters checkout
4. Checkout route reads `hlk_utm` cookie → passes UTM data as Stripe session `metadata`
5. In Stripe dashboard → each payment shows `utm_source`, `utm_medium`, `utm_campaign`
6. Vercel Analytics shows custom events with the same attribution context

## Quick Builder

Replace `{values}` in this template:
```
https://hammerlockai.com?utm_source={source}&utm_medium={medium}&utm_campaign={campaign}
```
