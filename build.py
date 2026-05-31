#!/usr/bin/env python3
"""
build.py — Generación local y servidor de desarrollo.

Uso:
  python3 build.py            # llama a la API de Kommo y genera index.html
  python3 build.py --serve    # genera y abre http://localhost:8000/index.html
  python3 build.py --serve --port 9000   # puerto personalizado
"""
import sys
import subprocess
import threading
import webbrowser
import http.server
import os


def main():
    args = sys.argv[1:]
    serve = "--serve" in args
    port = 8000
    if "--port" in args:
        try:
            port = int(args[args.index("--port") + 1])
        except (IndexError, ValueError):
            print("⚠ --port requiere un número. Usando 8000.")

    # --- Generar index.html ---
    script = os.path.join(os.path.dirname(__file__), "generar.py")
    print("▶ Generando index.html …")
    result = subprocess.run([sys.executable, script], cwd=os.path.dirname(script))
    if result.returncode != 0:
        print("✗ generar.py terminó con error.")
        sys.exit(result.returncode)
    print("✓ index.html generado.")

    if not serve:
        return

    # --- Servidor local ---
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, fmt, *a):
            pass  # silencia el log de cada request

    url = f"http://localhost:{port}/index.html"
    try:
        httpd = http.server.HTTPServer(("", port), QuietHandler)
    except OSError:
        print(f"✗ Puerto {port} en uso. Prueba: python3 build.py --serve --port 9000")
        sys.exit(1)

    print(f"✓ Servidor en {url}")
    print("  Presiona Ctrl+C para detener.\n")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n◼ Servidor detenido.")


if __name__ == "__main__":
    main()
