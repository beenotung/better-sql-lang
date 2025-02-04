import { queryToSQL } from 'better-sql.ts'

declare let noscriptMsg: HTMLDivElement
declare let errorMsg: HTMLDivElement

declare let loadExampleBtn: HTMLButtonElement
declare let copySQLBtn: HTMLButtonElement

declare let queryInput: HTMLTextAreaElement
declare let sqlOutput: HTMLTextAreaElement

declare let querySpace: HTMLDivElement
declare let sqlSpace: HTMLDivElement

loadExampleBtn.addEventListener('click', loadExample)
copySQLBtn.addEventListener('click', copySQL)

queryInput.addEventListener('input', updateQuery)

queryInput.addEventListener('keypress', checkBracket)
queryInput.addEventListener('keypress', checkEnter)

const brackets: Record<string, string> = {
  '[': ']',
  '{': '}',
  '(': ')',
}

function checkBracket(event: KeyboardEvent) {
  const open = event.key
  const close = brackets[open]
  if (!close) return
  const start = queryInput.selectionStart
  const end = queryInput.selectionEnd
  if (start !== end) return
  let text = queryInput.value
  const before = text.slice(0, start)
  const after = text.slice(start)
  text = before + open + close + after
  queryInput.value = text
  queryInput.selectionStart = start + 1
  queryInput.selectionEnd = end + 1
  event.preventDefault()
  updateQuery()
}

function checkEnter(event: KeyboardEvent) {
  if (event.key !== 'Enter') return

  const start = queryInput.selectionStart
  const end = queryInput.selectionEnd
  if (start !== end) return

  let text = queryInput.value
  const before = text.slice(0, start)

  const open = before[before.length - 1]
  const isOpen = open in brackets

  const after = text.slice(start)
  const lastLine = before.split('\n').pop() || ''
  let indent = lastLine.match(/ */)?.[0] || ''
  const outerIndent = indent
  if (isOpen) {
    indent += '  '
  }

  text = before + '\r\n' + indent
  if (isOpen) {
    text += '\r\n' + outerIndent
  }
  text += after

  queryInput.value = text
  queryInput.selectionStart = start + 1 + indent.length
  queryInput.selectionEnd = end + 1 + indent.length
  event.preventDefault()

  updateQuery()
}

function updateTextAreaHeight() {
  const height = Math.max(
    calcHeight(queryInput, querySpace),
    calcHeight(sqlOutput, sqlSpace),
  )
  queryInput.style.minHeight = height + 'px'
  sqlOutput.style.minHeight = height + 'px'
}

function calcHeight(textarea: HTMLTextAreaElement, space: HTMLDivElement) {
  space.textContent = textarea.value
  const style = getComputedStyle(textarea)
  space.style.fontSize = style.fontSize
  space.style.fontFamily = style.fontFamily
  return space.getBoundingClientRect().height
}

function updateQuery() {
  try {
    const sql = queryToSQL(queryInput.value)
    sqlOutput.value = sql
    errorMsg.hidden = true
  } catch (error) {
    console.error('Failed to convert query into sql:', error)
    errorMsg.hidden = false
    errorMsg.textContent = String(error)
  }
  updateTextAreaHeight()
}

const sampleQueries = [
  /* sql */ `
select post [
  id as post_id
  title
  author_id
  user as author { nickname, avatar } where delete_time is null
  type_id
  post_type {
    name as type
    is_hidden
  } where is_hidden = 0 or user.is_admin = 1
] where created_at >= :since
    and delete_time is null
    and title like :keyword
  order by created_at desc
  limit 25
`,
  /* sql */ `
select reply [
  post {
    title
    user as author {
      nickname as author
    }
  }
  user as guest {
    nickname as vistor
  }
  comment
]
`,
].map(query => query.trim())

function loadExample() {
  for (const query of sampleQueries) {
    if (queryInput.value === query) {
      continue
    }
    queryInput.value = query
    updateQuery()
    break
  }
}

let copySQLTimeout: ReturnType<typeof setTimeout>

function copySQL() {
  if (copySQLTimeout) {
    clearTimeout(copySQLTimeout)
  }
  sqlOutput.select()
  sqlOutput.setSelectionRange(0, sqlOutput.value.length)
  if (document.execCommand('copy')) {
    copySQLBtn.textContent = 'Copied to clipboard'
    copySQLBtn.style.color = 'darkgreen'
  } else {
    copySQLBtn.textContent = 'Clipboard not supported, please copy manually'
    copySQLBtn.style.color = 'red'
  }
  copySQLTimeout = setTimeout(() => {
    copySQLBtn.textContent = 'Copy SQL query'
    copySQLBtn.style.color = ''
  }, 2500)
}

updateQuery()

noscriptMsg.remove()
