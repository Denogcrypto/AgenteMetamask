# 🚀 IA Compradora - Guía de Ejecución y Coordenadas

Este sistema permite buscar productos en tiempo real mediante técnicas de scraping avanzado (Playwright) e integrarlos con una interfaz de chat inteligente.

## 📁 Archivos Clave
- `scraper.py`: El "motor" de búsqueda. Contiene la lógica de Playwright, evasión de bloqueos y ranking por reputación.
- `api.py`: El servidor FastAPI que expone la funcionalidad del scraper.
- `app.js`: Integración en el chat (reemplaza frases de búsqueda por llamadas a la API).

## 🛠 Instalación de Requisitos
Si es la primera vez que lo corres en una máquina nueva, ejecutá estos comandos:

```bash
# 1. Instalar dependencias de Python
pip install playwright playwright-stealth fastapi uvicorn beautifulsoup4

# 2. Instalar los binarios de los navegadores (necesario para Playwright)
python -m playwright install chromium
```

## 🏃 Cómo ponerlo en marcha
Para que el chat de tu web pueda buscar productos, el servidor de IA debe estar corriendo:

1. Abrí una terminal en la carpeta del proyecto.
2. Ejecutá:
   ```bash
   python api.py
   ```
3. Verás un mensaje indicando que la API está corriendo en `http://0.0.0.0:8000`.

## 🤖 Cómo usarlo en el Chat
Una vez que `api.py` esté corriendo, podés entrar a tu `index.html` y escribir cosas como:
- *"Buscame el iPhone 13 más barato"*
- *"Precio de una cafetera Nespresso"*
- *"Quiero comprar una silla gamer"*

El chat detectará la intención, llamará a tu scraper y te mostrará un widget con el mejor producto y su link directo.

## 🛡 Consideraciones de Seguridad y Escala
- **Proxies:** Para escala masiva, se recomienda editar `scraper.py` e integrar un servicio de rotación de IPs (como BrightData o Oxylabs) en la configuración del `browser_context`.
- **Headless Mode:** Actualmente el scraper corre en modo `headless=True` (sin ventana). Si falla por bloqueos, podés ponerlo en `False` para depurar visualmente.
- **Cache:** Si vas a tener millones de consultas, integrá Redis en `api.py` para no scrapear el mismo producto repetidas veces en un lapso corto de tiempo.

---
*Diseñado por el equipo de Arquitectos AI & Blockchain.*
