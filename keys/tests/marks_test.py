# Mark mode test: python3 keys/tests/marks_test.py (repo served on port 8765)
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8765/keys/'
SH = 'keys/tests/shots/'
cls = "m=>{const r=document.querySelector('#keys rect[data-m=\"'+m+'\"]');return r.getAttribute('class')}"
with sync_playwright() as p:
    b = p.chromium.launch(); errors = []
    ctx = b.new_context(viewport={'width': 1366, 'height': 768})
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL); page.wait_for_timeout(800)
    page.keyboard.press('m'); assert page.is_visible('#markbar')
    # paint C3..G3 green by dragging with the mouse
    def keyxy(m):
        bb = page.locator('#keys rect[data-m="%d"]' % m).bounding_box(); return bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] - 40
    x, y = keyxy(48); page.mouse.move(x, y); page.mouse.down()
    x2, _ = keyxy(55); page.mouse.move(x2, y, steps=8); page.mouse.up()
    marks = page.evaluate("JSON.parse(localStorage.getItem('keys-settings-v1')).marks")
    assert set(marks) == {'48', '50', '52', '53', '55'}, marks
    # pick colour 3 (passaggio), rename, laptop key paints
    page.click('.dot[data-c="2"]')
    page.fill('input[data-c="2"]', 'Break'); page.keyboard.press('Enter')
    page.keyboard.down('h'); page.keyboard.up('h')   # H = A3 (57)
    assert 'mk2' in page.evaluate(cls, 57)
    # tapping a painted key with its own colour clears it
    page.click('.dot[data-c="0"]'); x, y = keyxy(48); page.mouse.click(x, y)
    assert 'mk0' not in page.evaluate(cls, 48)
    page.screenshot(path=SH + 'marks-editing.png')
    page.keyboard.press('m'); assert not page.is_visible('#markbar')
    assert 'Break' in page.inner_text('#legend') and 'Comfortable' in page.inner_text('#legend')
    page.keyboard.press('n')   # fit to marks
    view = page.evaluate("JSON.parse(localStorage.getItem('keys-settings-v1')).view")
    page.screenshot(path=SH + 'marks-done.png')
    page.reload(); page.wait_for_timeout(600)
    assert 'mk2' in page.evaluate(cls, 57) and 'mk0' in page.evaluate(cls, 50)
    print('fitted view', view)
    ctx.close()
    ctx = b.new_context(viewport={'width': 360, 'height': 780}, is_mobile=True, has_touch=True, device_scale_factor=2)
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL); page.wait_for_timeout(600); page.click('#markBtn'); page.wait_for_timeout(200)
    o = page.evaluate("[document.documentElement.scrollWidth, innerWidth]"); assert o[0] <= o[1], o
    page.screenshot(path=SH + 'marks-phone.png'); ctx.close()
    print('errors', errors); assert not errors; print('mark tests: all passed')
