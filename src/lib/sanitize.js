// Keeps only basic formatting tags (and https links) from product descriptions written in the dashboard
const ALLOWED = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'DIV'])
export function sanitizeHtml(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const walk = (node) => {
    ;[...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) return
      if (n.nodeType !== 1 || !ALLOWED.has(n.tagName)) { if (n.nodeType === 1) { walk(n); n.replaceWith(...n.childNodes) } else n.remove(); return }
      const href = n.tagName === 'A' ? n.getAttribute('href') : null
      ;[...n.attributes].forEach((a) => n.removeAttribute(a.name))
      if (href && /^https?:\/\//i.test(href)) { n.setAttribute('href', href); n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener noreferrer') }
      walk(n)
    })
  }
  const root = doc.body.firstChild
  walk(root)
  return root.innerHTML.replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>').replace(/<p>(\s|<br>)*<\/p>/g, '') // drop empty paragraphs
}
export const plain = (html) => new DOMParser().parseFromString(html || '', 'text/html').body.textContent.trim()
