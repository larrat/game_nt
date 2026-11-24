"""Local UI smoke for the Kurokage route with entirely synthetic responses.

Requires Python Playwright and Chromium. Start Vite with the fixture URL/anon
key in docs/qa/JORNADA-CRITICA-2026-10-31.md. No staging/production traffic is
permitted by this fixture, and its results do not verify server rules.
"""
import base64
import json
import os
import re
import time
from collections import Counter
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

APP = "http://127.0.0.1:5179"
API = "http://127.0.0.1:54399"
USER = {"id": "00000000-0000-4000-8000-000000000001", "aud": "authenticated",
        "email": "fixture@example.invalid", "app_metadata": {}, "user_metadata": {}}
AVATAR = "/images/characters/3-9.png"
NPC = {"id": 9, "character_id": 7, "name": "Rival de Teste", "level": 1,
       "hp": 6, "chakra": 0, "atk": 0, "def": 0, "avatar": AVATAR}


def encode(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")


def assert_layout(page):
    section = page.get_by_role("region", name="Preparação para o duelo")
    expect(section).to_be_visible()
    assert section.get_by_role("progressbar").count() == 3
    assert section.evaluate("(el) => el.scrollWidth <= el.clientWidth + 1")
    assert section.get_by_role("link", name="Recuperar no Ichiraku").get_attribute("href") == "/ichiraku"
    assert section.get_by_role("link", name="Revisar técnicas").get_attribute("href") == "/tecnicas"
    expect(page.get_by_role("heading", name="Escolha seu confronto")).to_be_visible()


class Fixture:
    def __init__(self):
        self.player = None
        self.calls = Counter()

    def handle(self, route):
        url = urlparse(route.request.url)
        origin = f"{url.scheme}://{url.netloc}"
        path = url.path
        if origin == APP:
            route.continue_()
            return
        if origin != API:
            route.abort()
            return

        request = route.request
        method = request.method
        accept = request.headers.get("accept", "")
        payload = request.post_data_json if method == "POST" and request.post_data else {}
        headers = {"access-control-allow-origin": APP,
                   "access-control-allow-headers": "*",
                   "access-control-allow-methods": "GET, POST, HEAD, OPTIONS",
                   "access-control-expose-headers": "content-range"}

        def respond(body=None, status=200):
            route.fulfill(status=status, headers=headers, json=body)

        if method == "OPTIONS":
            route.fulfill(status=204, headers=headers)
            return
        if path == "/auth/v1/token":
            jwt = ".".join([encode({"alg": "HS256", "typ": "JWT"}),
                            encode({"sub": USER["id"], "exp": int(time.time()) + 3600}),
                            base64.urlsafe_b64encode(b"local-fixture").decode().rstrip("=")])
            respond({"access_token": jwt, "refresh_token": "local-fixture",
                     "token_type": "bearer", "expires_in": 3600, "user": USER})
            return
        if path == "/auth/v1/user":
            respond(USER)
            return

        name = path.rsplit("/", 1)[-1]
        if "/rpc/" in path:
            self.calls[name] += 1
            if name == "contar_ninjas_vila":
                respond([])
            elif name == "criar_personagem":
                assert self.player is None
                self.player = {
                    "id": 42, "user_id": USER["id"], "name": payload["p_name"],
                    "avatar": AVATAR, "village_id": 1, "character_id": 7,
                    "level": 1, "xp": 0, "ryous": 1000, "wins_dojo": 0,
                    "hp": 130, "chakra": 120, "stamina": 120, "pontos_atributos": 0,
                    "forca": 0, "energia": 0, "vip_coins": 0,
                    "rank": "Estudante da Academia", "jutsus_learned": [], "active_missions": []
                }
                respond({"success": True, "player": self.player})
            elif name == "treinar_atributos":
                assert self.player["id"] == payload["p_player_id"]
                assert payload["p_atributo"] == "energia" and payload["p_quantidade"] == 1
                assert self.player["pontos_atributos"] == 1
                self.player.update({"energia": 2, "pontos_atributos": 0})
                respond({"success": True, "gained": 2, "quantity": 1, "remaining_points": 0})
            elif name == "iniciar_combate_sessao":
                assert payload["p_is_dojo"] and payload["p_enemy_id"] == NPC["id"]
                respond({"success": True, "session_id": "mock-combat-1", "enemy_id": NPC["id"],
                         "enemy_name": NPC["name"], "enemy_level": 1, "enemy_hp": 6,
                         "enemy_max_hp": 6, "enemy_atk": 0, "enemy_def": 0, "enemy_chakra": 0})
            elif name == "resolver_turno_combate_sessao":
                assert payload["p_session_id"] == "mock-combat-1" and payload["p_action"] == "basic"
                respond({"success": True, "hit": True, "enemy_hp_remaining": 0,
                         "damage": 6, "stamina_remaining": 117})
            elif name == "finalizar_combate_sessao":
                assert payload["p_session_id"] == "mock-combat-1"
                assert self.calls[name] == 1, "Client requested a second payout"
                self.player.update({"xp": 25, "ryous": 1012, "wins_dojo": 1, "stamina": 117})
                respond({"success": True, "session_settled": True, "xp_gained": 25, "ryous_gained": 12})
            else:
                respond({"code": "FIXTURE_UNCONFIGURED", "message": f"Unexpected RPC {name}"}, 400)
            return

        if name == "players" and method == "HEAD":
            headers["content-range"] = "0-0/1" if self.player else "*/0"
            route.fulfill(status=200, headers=headers)
            return
        data = {
            "players": [self.player] if self.player else [],
            "characters": [{"id": 7, "name": "Ninja de Teste", "base_avatar_url": AVATAR}],
            "avatars": [{"id": AVATAR, "name": "Visual de Teste", "character_id": 7, "is_base": True}],
            "attributes": [{"id": 1, "field": "energia", "label": "Energia", "hero_min": 1, "hero_max": 2}],
            "ranks": [{"id": 1, "name_id": "estudante", "title": "Estudante da Academia"}],
            "npcs": [NPC],
        }.get(name, [])
        if "vnd.pgrst.object" in accept:
            respond(data[0] if data else None)
        else:
            respond(data)


def journey(browser):
    fixture = Fixture()
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, service_workers="block")
    context.route("**/*", fixture.handle)
    page = context.new_page()
    page.set_default_timeout(12000)
    js_errors = []
    page.on("pageerror", lambda error: js_errors.append(str(error)))

    page.goto(APP + "/login")
    page.get_by_label("E-mail").fill(USER["email"])
    page.get_by_label("Senha", exact=True).fill("synthetic-fixture")
    page.locator("button[type=submit]").click()
    page.get_by_role("button", name="Criar Personagem").click()
    page.get_by_role("button", name="Continuar").click()
    page.get_by_role("button", name="Continuar").click()
    page.get_by_label("Nome ninja").fill("Ninja Fixture")
    page.get_by_role("button", name="Criar Personagem").click()
    page.wait_for_url("**/dashboard")

    page.get_by_role("button", name="Treinar atributos").click()
    expect(page.get_by_role("button", name="Sem pontos disponíveis")).to_be_disabled()

    # New characters have no free points. Simulate a prerequisite earned in a
    # separate fixture event; never use this to bypass progression on the server.
    fixture.player["pontos_atributos"] = 1
    page.reload()
    page.get_by_role("button", name="Entrar no mundo ninja").click()
    page.wait_for_url("**/dashboard")
    page.get_by_role("button", name="Treinar atributos").click()
    page.get_by_role("button", name="Confirmar 1 ponto(s) em Energia").click()
    expect(page.get_by_role("button", name="Sem pontos disponíveis")).to_be_disabled()
    assert (fixture.player["energia"], fixture.player["pontos_atributos"]) == (2, 0)

    # Use client navigation; a full reload deliberately goes via selection.
    page.get_by_role("searchbox", name="Buscar telas no menu").fill("Dojo")
    page.locator("a[href='/dojo']").filter(visible=True).first.click()
    assert_layout(page)
    page.get_by_role("button", name="Buscar combate real").click()
    page.wait_for_url("**/combate")
    page.get_by_role("button", name=re.compile(r"Básico")).click()
    page.wait_for_url("**/dojo")
    assert_layout(page)
    assert fixture.calls["finalizar_combate_sessao"] == 1
    assert "117" in (page.get_by_role("progressbar", name="Stamina antes do duelo").get_attribute("aria-valuetext") or "")

    page.reload()
    page.get_by_role("button", name="Entrar no mundo ninja").click()
    page.wait_for_url("**/dashboard")
    expect(page.locator(".kuro-kpi").filter(has_text="Vitórias no dojo").locator("strong")).to_have_text("1")
    expect(page.locator(".kuro-kpi").filter(has_text="Ryous disponíveis").locator("strong")).to_have_text(re.compile(r"1[.,]?012"))
    expect(page.locator(".kuro-hero__xp-copy")).to_have_text(re.compile(r"25 / .* XP"))
    assert (fixture.player["xp"], fixture.player["ryous"], fixture.player["wins_dojo"]) == (25, 1012, 1)
    assert fixture.calls["finalizar_combate_sessao"] == 1

    # Also measure the same actual page at a mobile viewport, using the menu.
    page.set_viewport_size({"width": 390, "height": 844})
    page.get_by_role("button", name=re.compile(r"(Abrir|Exibir) menu")).click()
    page.get_by_role("searchbox", name="Buscar telas no menu").fill("Dojo")
    page.locator("a[href='/dojo']").filter(visible=True).first.click()
    assert_layout(page)
    assert fixture.calls["finalizar_combate_sessao"] == 1
    assert not js_errors, js_errors
    context.close()


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        try:
            journey(browser)
            print("PASS: create, training gate/debit, Dojo battle, one payout request, reload, 1440px/390px")
        finally:
            browser.close()
