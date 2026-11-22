# UI test: python3 keys/tests/ui_test.py  (with the repo served at http://localhost:8765)
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8765/keys/'
SHOTS = 'keys/tests/shots/'

def lit(page):
    return page.evaluate("[...document.querySelectorAll('#keys rect.on')].map(r=>+r.dataset.m)")

with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    errors = []

    # laptop
    ctx = b.new_context(viewport={'width': 1366, 'height': 768})
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL); page.wait_for_timeout(1500)
    page.screenshot(path=SHOTS + 'laptop.png')
    page.keyboard.down('a'); page.wait_for_timeout(50)
    assert lit(page) == [48], lit(page)          # A = C3 (default view starts on C3)
    page.keyboard.down('j'); page.wait_for_timeout(50)
    assert sorted(lit(page)) == [48, 59], lit(page)
    page.screenshot(path=SHOTS + 'laptop-playing.png')
    page.keyboard.up('a'); page.keyboard.up('j'); page.wait_for_timeout(50)
    assert lit(page) == []
    # pedal by Space
    page.keyboard.down(' '); assert page.evaluate("document.querySelector('#pedalBtn').classList.contains('on')")
    page.keyboard.up(' '); assert not page.evaluate("document.querySelector('#pedalBtn').classList.contains('on')")
    # octave up moves laptop keys
    page.keyboard.press('ArrowRight'); page.keyboard.down('a'); page.wait_for_timeout(50)
    assert lit(page) == [60], lit(page); page.keyboard.up('a')
    # chord mode with C major
    page.select_option('#keySel', '0-major'); page.keyboard.press('Escape')
    page.locator('#keys').click(position={'x': 5, 'y': 5}); page.wait_for_timeout(50)   # focus away from select
    page.keyboard.press('1'); page.keyboard.down('s'); page.wait_for_timeout(50)
    assert sorted(lit(page)) == [62, 65, 69], lit(page)    # D minor triad in C major
    page.keyboard.up('s'); page.keyboard.press('1')
    # loop: arm, play, close
    page.keyboard.press('2'); assert page.inner_text('#loopT') == 'Play to start…'
    page.keyboard.down('a'); page.wait_for_timeout(300); page.keyboard.up('a'); page.wait_for_timeout(500)
    page.keyboard.press('2'); page.wait_for_timeout(100)
    assert page.inner_text('#loopT') == '● Add layer', page.inner_text('#loopT')
    assert 'Loop' in page.inner_text('#info')
    page.wait_for_timeout(900)
    page.screenshot(path=SHOTS + 'laptop-loop.png')
    page.keyboard.press('Delete'); assert page.inner_text('#loopT') == '● Loop'
    # help
    page.keyboard.press('?'); assert page.evaluate("document.querySelector('#help').open")
    page.screenshot(path=SHOTS + 'help.png')
    page.keyboard.press('Escape'); assert not page.evaluate("document.querySelector('#help').open")
    # zoom, keys only, reload keeps settings
    page.keyboard.press('+'); page.keyboard.press('0')
    assert page.evaluate("document.body.classList.contains('bare')")
    page.screenshot(path=SHOTS + 'laptop-bare.png')
    page.reload(); page.wait_for_timeout(800)
    assert page.evaluate("document.body.classList.contains('bare')")
    assert page.input_value('#keySel') == '0-major'
    assert page.evaluate("JSON.parse(localStorage.getItem('keys-settings-v1')).view") == 17
    page.click('#showBars'); assert not page.evaluate("document.body.classList.contains('bare')")
    # mouse: click a key, drag across
    box = page.locator('#keys').bounding_box()
    page.mouse.move(box['x'] + 40, box['y'] + box['height'] - 30); page.mouse.down(); page.wait_for_timeout(50)
    first = lit(page); page.mouse.move(box['x'] + 200, box['y'] + box['height'] - 30, steps=5); page.wait_for_timeout(50)
    second = lit(page); page.mouse.up()
    assert len(first) == 1 and len(second) == 1 and first != second, (first, second)
    grand = page.evaluate("caches.open('pc-grand-v1').then(c=>c.keys()).then(k=>k.length)")
    print('grand samples cached:', grand)
    ctx.close()

    # big screen
    ctx = b.new_context(viewport={'width': 1920, 'height': 1080})
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL); page.wait_for_timeout(800); page.screenshot(path=SHOTS + 'bigscreen.png'); ctx.close()

    # phones (Android): upright and sideways
    for w, h, name in [(340, 720, 'phone340'), (360, 780, 'phone360'), (412, 915, 'phone412'), (915, 412, 'phone-landscape')]:
        ctx = b.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, device_scale_factor=2)
        page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL); page.wait_for_timeout(800)
        over = page.evaluate("[document.documentElement.scrollWidth, innerWidth, document.querySelector('.top').scrollWidth, document.querySelector('.top').clientWidth]")
        assert over[0] <= over[1] and over[2] <= over[3] + 1, (name, over)
        kb = page.locator('#keys').bounding_box()
        page.touchscreen.tap(kb['x'] + 20, kb['y'] + kb['height'] - 20)
        page.screenshot(path=SHOTS + name + '.png')
        print(name, 'keys area', round(kb['width']), 'x', round(kb['height']))
        ctx.close()

    print('page errors:', errors)
    assert not errors
    print('UI tests: all passed')
    b.close()
