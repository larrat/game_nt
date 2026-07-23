import sys

try:
    with open("src/App.jsx", "r") as f:
        content = f.read()

    # Import
    if "import Exame from './pages/Exame';" not in content:
        content = content.replace("import Ichiraku from './pages/Ichiraku';", "import Ichiraku from './pages/Ichiraku';\nimport Exame from './pages/Exame';")

    # Route
    if "<Route path=\"/exame\"" not in content:
        s_route = """<Route path="/evento" element={<Evento player={playerState} updatePlayer={updatePlayer} />} />"""
        r_route = """<Route path="/evento" element={<Evento player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/exame" element={<Exame player={playerState} updatePlayer={updatePlayer} />} />"""
        content = content.replace(s_route, r_route)

    with open("src/App.jsx", "w") as f:
        f.write(content)
        
    print("Success App.jsx")
except Exception as e:
    print("Error:", e)
