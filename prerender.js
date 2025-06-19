import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
const { render } = await import('./dist/server/entry-server.js')

// Get all routes from src/pages
const routesToPrerender = fs
  .readdirSync(toAbsolute('src/pages'))
  .map((file) => {
    const name = file.replace(/\.tsx$/, '').toLowerCase()
    // Handle special cases for known routes
    switch(name) {
      case 'index':
        return '/'
      case 'notfound':
        return '/404'
      default:
        return `/${name}`
    }
  })

;(async () => {
  for (const url of routesToPrerender) {
    const appHtml = render(url)
    const html = template.replace('<!--app-html-->', appHtml)

    // Create output directory structure
    const filePath = `dist${url === '/' ? '/index' : url}.html`
    const dir = path.dirname(toAbsolute(filePath))
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(toAbsolute(filePath), html)
    console.log('pre-rendered:', filePath)
  }
})()
