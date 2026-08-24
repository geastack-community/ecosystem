---
layout: home

hero:
  name: "gea-query"
  text: "Zero-Hooks Data-Fetching for Gea"
  tagline: "The definitive, class-based query and caching library built strictly for Gea's OOP ecosystem."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/KoHaRxnP/gea-query

features:
  - title: Pure OOP & Zero-Hooks
    details: No functional hooks or hidden reactive primitives. Seamlessly integrates with Gea components via Class Mixins.
  - title: Smart Caching
    details: Built-in request deduplication, stale-while-revalidate states, and precise cache management.
  - title: Explicit Lifecycle
    details: Automatically binds to Gea's explicit `dispose()` method. Zero memory leaks, zero detached background tasks.
---