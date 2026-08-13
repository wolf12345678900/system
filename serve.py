"""
Startet THE SYSTEM lokal und oeffnet den Browser.

Aufruf:  python serve.py        (oder einfach START.bat doppelklicken)
Beenden: Strg + C
"""

import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser

FIRST_PORT = 8123
TRIES = 12

os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    """Wie SimpleHTTPRequestHandler, nur ohne Caching und ohne Log-Spam."""

    def end_headers(self):
        # Sonst liefert der Browser nach Aenderungen alte Dateien aus.
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, fmt, *args):
        if len(args) > 1 and str(args[1]).startswith(("4", "5")):
            sys.stderr.write("  %s %s\n" % (args[1], args[0]))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def port_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) != 0


def already_running(port):
    """Laeuft auf dem Port bereits THE SYSTEM?"""
    try:
        import urllib.request
        with urllib.request.urlopen(
                "http://127.0.0.1:%d/manifest.webmanifest" % port, timeout=1.5) as r:
            return b"THE SYSTEM" in r.read(400)
    except Exception:
        return False


def find_port():
    for i in range(TRIES):
        port = FIRST_PORT + i
        if port_free(port):
            return port
    return None


def main():
    if not os.path.exists("index.html"):
        print("FEHLER: index.html nicht gefunden.")
        print("Diese Datei muss im Ordner der App liegen.")
        return 1

    # Der Speicherstand haengt am Port: localhost:8123 und localhost:8124 sind
    # fuer den Browser zwei verschiedene Seiten mit getrennten Daten. Deshalb
    # immer denselben Port benutzen - laeuft dort schon eine Instanz, oeffnen
    # wir einfach die statt einer zweiten auf einem anderen Port.
    if not port_free(FIRST_PORT):
        if already_running(FIRST_PORT):
            url = "http://localhost:%d" % FIRST_PORT
            print()
            print("  THE SYSTEM laeuft bereits: " + url)
            print("  Browser wird geoeffnet ...")
            print()
            webbrowser.open(url)
            return 0
        print()
        print("  ACHTUNG: Port %d ist von einem anderen Programm belegt." % FIRST_PORT)
        print("  Die App startet auf einem Ausweichport - dort ist dein")
        print("  Fortschritt NICHT sichtbar, weil der Browser die Daten")
        print("  pro Adresse getrennt speichert.")
        print()
        print("  Besser: das andere Programm beenden und neu starten.")
        print()

    port = find_port()
    if port is None:
        print("FEHLER: kein freier Port zwischen %d und %d." % (FIRST_PORT, FIRST_PORT + TRIES))
        return 1

    url = "http://localhost:%d" % port

    print()
    print("  " + "=" * 46)
    print("   THE SYSTEM laeuft")
    print()
    print("   " + url)
    print()
    print("   Dieses Fenster offen lassen.")
    print("   Beenden mit Strg + C")
    print("  " + "=" * 46)
    print()

    threading.Timer(0.8, lambda: webbrowser.open(url)).start()

    with Server(("", port), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server beendet.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
