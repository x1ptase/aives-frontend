import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { AxiosError } from 'axios'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

/** Dùng resolver/adapter thật của dự án, không gọi backend hoặc ghi database dùng chung. */
let server, api, helpers, client, Provider, Form, Page
let requests, failure, reply, pages
const subject = { id: 4, code: 'MLN111', name: 'Triết học Mác – Lênin', description: '' }
const rubric = () => ({ id: 31, subjectId: 4, title: 'Rubric MLN111', description: 'Dùng chung cho môn', criteria: [
  { id: 71, criterionText: 'Chính xác', pointWeight: 4, isMandatory: true, displayOrder: 1 },
  { id: 72, criterionText: 'Lập luận', pointWeight: 6, isMandatory: false, displayOrder: 2 },
] })
const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

before(async () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'TEST_ONLY_TOKEN', removeItem() {} } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { pathname: '/lecturer/rubrics', href: '' } } })
  server = await createServer({ logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null } })
  api = (await server.ssrLoadModule('/src/modules/questions/api.ts')).subjectRubricApi
  helpers = await server.ssrLoadModule('/src/modules/questions/components/rubricHelpers.ts')
  Provider = (await server.ssrLoadModule('/src/shared/components/common/FeedbackProvider.tsx')).default
  Form = (await server.ssrLoadModule('/src/modules/questions/components/RubricFormModal.tsx')).default
  Page = (await server.ssrLoadModule('/src/modules/questions/pages/LecturerRubrics.tsx')).default
  client = (await server.ssrLoadModule('/src/shared/api/axios.ts')).default
  client.defaults.adapter = async config => {
    requests.push({ method: config.method, url: config.url, data: config.data ? JSON.parse(config.data) : undefined,
      params: config.params, token: config.headers.Authorization, signal: config.signal })
    if (failure) throw new AxiosError('Database internal details', 'ERR_BAD_REQUEST', config, undefined,
      failure.status ? { status: failure.status, data: failure.data, headers: {}, statusText: 'Test', config } : undefined)
    const data = config.url === '/lecturer-subject-assignments/my-subjects' ? pages[config.params.page] : reply
    return { data, status: 200, statusText: 'OK', headers: {}, config }
  }
})

beforeEach(() => {
  requests = []; failure = null; reply = { code: 1000, result: rubric() }
  pages = [{ code: 1000, result: { items: [subject], page: 0, size: 100, totalElements: 1, totalPages: 1 } }]
})

after(async () => {
  await server?.close()
  if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage)
  else delete globalThis.localStorage
  if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow)
  else delete globalThis.window
})

test('GET rubric is scoped to subject and uses the existing bearer interceptor', async () => {
  const controller = new AbortController()
  assert.equal((await helpers.loadSubjectRubric(4, controller.signal)).id, 31)
  assert.equal(requests[0].url, '/rubrics/subject/4')
  assert.equal(requests[0].token, 'Bearer TEST_ONLY_TOKEN')
  assert.equal(requests[0].signal, controller.signal)
})

test('POST contains subject and criteria but no question, owner or UI identifiers', async () => {
  await api.create(helpers.rubricCreatePayload(helpers.rubricForm(subject, rubric()), subject.id))
  assert.equal(requests[0].url, '/rubrics'); assert.equal(requests[0].method, 'post')
  assert.deepEqual(Object.keys(requests[0].data).sort(), ['subjectId', 'title', 'description', 'criteria'].sort())
  assert.deepEqual(requests[0].data.criteria[0], { criterionText: 'Chính xác', pointWeight: 4, isMandatory: true, displayOrder: 1 })
})

test('PUT uses rubric ID rather than subject ID and does not send old criterion IDs', async () => {
  await api.update(31, helpers.rubricUpdatePayload(helpers.rubricForm(subject, rubric())))
  assert.equal(requests[0].url, '/rubrics/31'); assert.equal(requests[0].method, 'put')
  assert.equal(requests[0].data.subjectId, undefined)
  assert.equal(requests[0].data.criteria[0].id, undefined)
  assert.equal(requests[0].data.criteria[0].key, undefined)
})

test('DELETE targets the rubric and preserves source API contract', async () => {
  await api.delete(31)
  assert.equal(requests[0].url, '/rubrics/31'); assert.equal(requests[0].method, 'delete')
  assert.equal(requests[0].data, undefined)
})

test('Assigned subjects walk every page without calling the global subjects API', async () => {
  pages = [
    { code: 1000, result: { items: [subject], page: 0, size: 1, totalElements: 2, totalPages: 2 } },
    { code: 1000, result: { items: [{ ...subject, id: 8, code: 'SWD392' }], page: 1, size: 1, totalElements: 2, totalPages: 2 } },
  ]
  assert.deepEqual((await helpers.loadRubricSubjects()).map(item => item.id), [4, 8])
  assert.equal(requests.length, 2)
  assert.ok(requests.every(item => item.url === '/lecturer-subject-assignments/my-subjects' && item.params.size === 100))
  assert.deepEqual(requests.map(item => item.params.page), [0, 1])
})

test('No assignments is a valid empty state', async () => {
  pages = [{ code: 1000, result: { items: [], page: 0, size: 100, totalElements: 0, totalPages: 0 } }]
  assert.deepEqual(await helpers.loadRubricSubjects(), [])
})

test('Malformed assignment pagination is not presented as an empty success', async () => {
  pages[0].result.page = 9
  await assert.rejects(helpers.loadRubricSubjects(), /phân công môn học không hợp lệ/)
})

test('Canceled assignment and rubric reads never reach a network adapter', async () => {
  const controller = new AbortController(); controller.abort()
  await assert.rejects(helpers.loadRubricSubjects(controller.signal), error => error.code === 'ERR_CANCELED')
  await assert.rejects(helpers.loadSubjectRubric(4, controller.signal), error => error.code === 'ERR_CANCELED')
  assert.equal(requests.length, 0)
})

test('Only 404/code1600 means a subject has no rubric', async () => {
  failure = { status: 404, data: { code: 1600 } }
  assert.equal(await helpers.loadSubjectRubric(4), null)
})

for (const [status, code] of [[403, 1101], [401, 1003], [404, 1016], [500, 1600], [400, 1602]]) {
  test(`HTTP ${status}/code${code} is not mistaken for a missing rubric`, async () => {
    failure = { status, data: { code } }
    await assert.rejects(helpers.loadSubjectRubric(4))
  })
}

test('Unknown network outcome is not mistaken for missing rubric or silently retried', async () => {
  failure = {}
  await assert.rejects(helpers.loadSubjectRubric(4), error => {
    assert.match(helpers.rubricError(error, ''), /Chưa thể xác nhận kết quả/)
    return true
  })
  assert.equal(requests.length, 1)
})

test('Payload renumbers reordered rows, trims strings and sums exact decimal hundredths', () => {
  const form = { title: ' Tên rubric ', description: ' Mô tả ', criteria: [
    { key: 'a', text: ' B ', points: '3,33', mandatory: false },
    { key: 'b', text: ' A ', points: '6.67', mandatory: true },
  ] }
  assert.equal(helpers.rubricTotal(form.criteria), 10)
  assert.deepEqual(helpers.rubricUpdatePayload(form), { title: 'Tên rubric', description: 'Mô tả', criteria: [
    { criterionText: 'B', pointWeight: 3.33, isMandatory: false, displayOrder: 1 },
    { criterionText: 'A', pointWeight: 6.67, isMandatory: true, displayOrder: 2 },
  ] })
})

for (const points of ['', '0', '-1', 'NaN', '1.001', 'Infinity', '10.01', '1e1']) {
  test(`Invalid criterion points ${JSON.stringify(points)} cannot be saved`, () => {
    const form = helpers.rubricForm(subject, rubric()); form.criteria[0].points = points
    assert.throws(() => helpers.rubricUpdatePayload(form))
    assert.equal(helpers.rubricTotal(form.criteria), null)
  })
}

test('Invalid totals, empty criteria/text/title and control characters block submission', () => {
  for (const mutate of [form => { form.title = ' ' }, form => { form.title = 'a'.repeat(256) },
    form => { form.description = '\0' }, form => { form.criteria = [] },
    form => { form.criteria[0].text = ' ' }, form => { form.criteria[0].text = '\0' },
    form => { form.criteria[0].points = '3.99' }]) {
    const form = helpers.rubricForm(subject, rubric()); mutate(form)
    assert.throws(() => helpers.rubricUpdatePayload(form))
  }
})

test('Unsafe identifiers cannot become API resource targets', () => {
  for (const id of [0, -1, 1.5, '', null, {}, '4/../../users', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => helpers.rubricIdentifier(id))
  }
  assert.equal(helpers.rubricIdentifier('4'), 4)
})

test('Parsing rejects wrong subject, duplicate criterion IDs and malformed success payloads', () => {
  for (const mutate of [data => { data.code = 1600 }, data => { data.result.subjectId = 8 },
    data => { data.result.criteria[1].id = 71 }, data => { data.result.criteria[0].pointWeight = '4' },
    data => { data.result.criteria[0].isMandatory = null }]) {
    const data = { code: 1000, result: rubric() }; mutate(data)
    assert.throws(() => helpers.parseSubjectRubric(data, 4))
  }
})

test('Legacy invalid totals/order remain visible for editing without silently becoming ready', () => {
  const source = rubric(); source.criteria[0].pointWeight = 3; source.criteria[1].displayOrder = 1
  const parsed = helpers.parseSubjectRubric({ code: 1000, result: source }, 4)
  assert.equal(helpers.isRubricReady(parsed), false)
  assert.equal(parsed.criteria[0].pointWeight, 3)
  assert.equal(parsed.criteria[1].displayOrder, 1)
  assert.equal(helpers.isRubricReady(rubric()), true)
  assert.equal(helpers.rubricForm(subject, null).criteria.length, 1)
})

for (const code of [1002, 1003, 1004, 1016, 1101, 1600, 1601, 1602, 1603, 1604]) {
  test(`Rubric error ${code} uses a controlled Vietnamese message`, () => {
    const error = new AxiosError('Internal SQL', '', undefined, undefined, { status: 400, data: { code, message: 'Internal SQL' } })
    const text = helpers.rubricError(error, 'Thông báo chung')
    assert.notEqual(text, 'Thông báo chung'); assert.doesNotMatch(text, /SQL|Internal/)
  })
}

test('Unknown server errors do not reveal arbitrary database messages', () => {
  const error = new AxiosError('SQL', '', undefined, undefined, { status: 500, data: { message: 'SELECT private data' } })
  assert.match(helpers.rubricError(error, ''), /Máy chủ/)
  assert.doesNotMatch(helpers.rubricError(error, ''), /SELECT|private/)
})

test('Create/edit forms render Vietnamese controls, fixed subject, criteria and decimal points', () => {
  for (const existing of [null, rubric()]) {
    const html = renderToStaticMarkup(createElement(Provider, null, createElement(Form, {
      subject, rubric: existing, onClose() {}, onSaved() {}, onWritingChange() {},
    })))
    for (const text of ['MLN111', 'Tiêu chí đánh giá', 'Thêm tiêu chí', 'Điểm tối đa', 'Bắt buộc', 'Lưu rubric', 'Hủy']) assert.ok(html.includes(text), text)
    assert.match(html, /noValidate=""/i); assert.match(html, /step="0.01"/)
    assert.doesNotMatch(html, /<select|name="lecturerId"|name="questionId"/)
    assert.ok(html.includes(existing ? 'Sửa rubric' : 'Tạo rubric'))
  }
})

test('Page renders the assigned-subject selector and a non-global loading state', () => {
  const html = renderToStaticMarkup(createElement(Page))
  assert.match(html, /Rubrics/); assert.match(html, /Môn học được phân công/)
  assert.doesNotMatch(html, /Tất cả các môn|All subjects/)
})

test('Navigation places Rubrics immediately after lecturer Learning Materials and routes to the module', async () => {
  const sidebar = await readFile(new URL('../../app/layout/Sidebar.tsx', import.meta.url), 'utf8')
  const nav = sidebar.split('const LECTURER_NAV')[1].split('const STUDENT_NAV')[0]
  assert.ok(nav.indexOf('Learning Materials') < nav.indexOf('Rubrics'))
  assert.ok(nav.indexOf('Rubrics') < nav.indexOf('Question Bank'))
  assert.match(nav, /path: '\/lecturer\/rubrics'/)
  const shell = await readFile(new URL('../../app/shells/LecturerApp.tsx', import.meta.url), 'utf8')
  assert.match(shell, /path="\/rubrics" element=\{<LecturerRubrics/)
  const header = await readFile(new URL('../../app/layout/TopHeader.tsx', import.meta.url), 'utf8')
  assert.match(header, /label: 'Rubrics', icon: <IconClipboard \/>, path: '\/lecturer\/rubrics'/)
})

test('Rubric actions use shared in-app dialogs without native browser alerts or confirmations', async () => {
  const page = await readFile(new URL('./pages/LecturerRubrics.tsx', import.meta.url), 'utf8')
  const form = await readFile(new URL('./components/RubricFormModal.tsx', import.meta.url), 'utf8')
  assert.match(page, /feedback.confirm\(/); assert.match(page, /feedback.notify\(/)
  assert.match(form, /feedback.notify\(/)
  assert.doesNotMatch(page + form, /window\.(alert|confirm)|\balert\(/)
})
