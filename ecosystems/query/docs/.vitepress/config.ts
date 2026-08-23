import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "@geastack-community/query",
  description: "The Zero-Hooks Data-Fetching & Caching Library for Gea",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' }
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/geastack-community/ecosystem' }
    ]
  }
})
